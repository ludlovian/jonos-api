import { setTimeout as sleep } from 'node:timers/promises'
import assert from 'node:assert'
import Parsley from '@ludlovian/parsley'

import config from '../config.mjs'
import cleanObject from '../clean-object.mjs'
import { parseElementTexts, parseElementVals } from '../parse-element.mjs'
import Subscription from './subscription.mjs'

const XML_PI = '<?xml version="1.0" encoding="utf-8"?>'

export default class SonosService {
  #player
  subscription

  constructor (player) {
    this.#player = player
    this.constructor.commands.forEach(cmd => {
      assert.ok(!!this[cmd])
      player[cmd] = this[cmd].bind(this)
    })
  }

  get name () {
    return this.constructor.name
  }

  get path () {
    return this.constructor.path
  }

  get player () {
    return this.#player
  }

  get listener () {
    return this.player.listener
  }

  get debug () {
    return this.#player.debug
  }

  get isListening () {
    return !!this.subscription
  }

  // Event process
  //
  // <name>:xml           - raised on the player with a Parsley element
  //                        of the raw XML element captured
  //
  // parseXmlElement      - called to turn the raw element into an object
  //                        the default implementation converts any purely
  //                        text elements, and also looks into the LastChange
  //                        if given.
  //
  // <name>:data          - this data is then emitted for any listeners
  //
  // parseEvent           - called to extract / convert the string data
  //
  // <name>               - emitted once all data converted
  handleEvent (elem) {
    this.player.emit(`${this.name}:xml`, elem)
    const parsedData = this.parseXmlElement(elem)
    this.player.emit(`${this.name}:data`, parsedData)
    const eventData = cleanObject(this.parseEvent(parsedData))
    if (eventData) this.player.emit(this.name, eventData)
  }

  parseXmlElement (msg) {
    const out = parseElementTexts(msg)
    if ('lastChange' in out) {
      parseElementVals(Parsley.from(out.lastChange), out)
    }
    return out
  }

  async callSOAP (method, parms, parse) {
    this.debug(method, parms)

    const { url, headers, body } = this.#prepareSOAP(method, parms)
    const fn = () => fetch(url, { method: 'POST', headers, body })

    let caughtErr

    for (let i = 0; i < config.apiCallRetryCount; i++) {
      try {
        const response = await this.#player.exec(fn)
        // defensive check: should never happen
        /* c8 ignore start */
        if (!response.ok) {
          throw Object.assign(new Error('Bad response'), { response })
        }
        /* c8 ignore end */
        const text = await response.text()
        const p = Parsley.from(text).find(`u:${method}Response`)
        return cleanObject(parseElementTexts(p))
        // defensive check: should never happen
        /* c8 ignore start */
      } catch (err) {
        err.jonos = { method, parms }
        caughtErr = caughtErr ?? err
        this.#player.emit('error', err)
      }
      /* c8 ignore end */
      await sleep(config.apiCallRetryDelay)
    }
    if (caughtErr) throw caughtErr
  }

  #prepareSOAP (method, parms) {
    const url = new URL(`${this.path}/Control`, this.#player.url)
    const headers = {
      soapaction: `"urn:schemas-upnp-org:service:${this.name}:1#${method}"`,
      'Content-Type': 'text/xml; charset="utf-8"'
    }

    const ns = { 'xmlns:u': `urn:schemas-upnp-org:service:${this.name}:1` }
    const content = Parsley.create(`u:${method}`, ns)
    for (const [key, value] of Object.entries(parms)) {
      content.add(Parsley.create(key, {}, [value + '']))
    }

    const nsDefs = {
      'xmlns:s': 'http://schemas.xmlsoap.org/soap/envelope/',
      's:encodingStyle': 'http://schemas.xmlsoap.org/soap/encoding/'
    }

    const body =
      XML_PI +
      Parsley.create('s:Envelope', nsDefs)
        .add(Parsley.create('s:Body').add(content))
        .xml()

    return { url, headers, body }
  }

  async startListening () {
    if (this.subscription) return
    const listener = this.listener

    await listener.start()

    const sub = (this.subscription = new Subscription(this))
    listener.registerPath(sub.path, sub)
    await sub.subscribe()
  }

  async stopListening () {
    if (!this.subscription) return

    const sub = this.subscription
    await sub.unsubscribe()
    await this.listener.unregisterPath(sub.path)
    this.subscription = undefined
  }
}

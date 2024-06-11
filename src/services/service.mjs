import { setTimeout as sleep } from 'node:timers/promises'
import assert from 'node:assert'

import Parsley from '@ludlovian/parsley'

import config from '../config.mjs'
import cleanObject from '../clean-object.mjs'

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
    this.#player.on(this.name + ':xml', this.onXmlEvent.bind(this))
  }

  get name () {
    return this.constructor.name
  }

  get path () {
    return this.constructor.path
  }

  get systemWide () {
    return !!this.constructor.systemWide
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

  onXmlEvent (elem) {
    let data = this.parseXmlEvent(elem)
    if (data) data = cleanObject(data)
    if (data) this.player.emit(this.name, data)
  }

  // default parser does nothing
  parseXmlEvent () {}

  async callSOAP (method, parms, parse) {
    this.debug(method, parms)

    const { url, headers, body } = this.#prepareSOAP(method, parms)
    const fn = () => fetch(url, { method: 'POST', headers, body })

    let caughtErr

    for (let i = 0; i < config.apiCallRetryCount; i++) {
      try {
        const response = await this.#player.exec(fn)
        /* c8 ignore start */
        if (!response.ok) {
          throw Object.assign(new Error('Bad response'), { response })
        }
        /* c8 ignore end */
        const text = await response.text()
        const p = Parsley.from(text).find(`u:${method}Response`)
        return parse ? parse(p) : p
        /* c8 ignore start */
      } catch (err) {
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
    if (this.systemWide && listener.hasService(this.name)) return

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

import Parsley from 'parsley'
import sleep from 'pixutil/sleep'

import config from '../config.mjs'
import parseElement from '../parseElement.mjs'

const XML_PI = '<?xml version="1.0" encoding="utf-8"?>'

export default class SonosService {
  #player

  constructor (player) {
    this.#player = player
    this.constructor.commands.forEach(cmd => {
      if (!this[cmd]) throw new Error('Oops: ' + cmd)
      player[cmd] = this[cmd].bind(this)
    })
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

  // default event handler does nothing
  parseEvent () {}

  async callSOAP (method, parms, parse = parseElement) {
    const { url, headers, body } = this.#prepareSOAP(method, parms)
    const fn = () => fetch(url, { method: 'POST', headers, body })

    for (let i = 0; i < config.apiCallRetryCount; i++) {
      try {
        const response = await this.#player.exec(fn)
        if (!response.ok) {
          throw Object.assign(new Error('Bad response'), { response })
        }
        const text = await response.text()
        const p = Parsley.from(text).find(`u:${method}Response`)
        return parse(p)
      } catch (err) {
        this.#player.emit('error', err)
      }
      await sleep(config.apiCallRetryDelay)
    }
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
}

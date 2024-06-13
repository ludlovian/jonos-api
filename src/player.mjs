import util from 'node:util'
import { EventEmitter } from 'node:events'

import Parsley from '@ludlovian/parsley'
import timeout from '@ludlovian/timeout'
import Debug from '@ludlovian/debug'
import Lock from '@ludlovian/lock'

import config from './config.mjs'
import AVTransport from './services/avTransport.mjs'
import RenderingControl from './services/renderingControl.mjs'
import ZoneGroupTopology from './services/zoneGroupTopology.mjs'
import ContentDirectory from './services/contentDirectory.mjs'
import Listener from './services/listener.mjs'
import Discovery from './services/discovery.mjs'

export default class Player extends EventEmitter {
  static #playersByUrl = {}
  static listener = new Listener()
  static #discovery = new Discovery()

  #url
  debug
  #lock = new Lock() // used to serialise HTTP requests to the player
  #services

  static async discover () {
    const url = await timeout(
      Player.#discovery.discoverOne(),
      config.apiDiscoveryTimeout
    )

    const p = new Player(url)
    return p.getZoneGroupState()
  }

  // only used if things are bad
  /* c8 ignore start */
  static hardReset () {
    console.warn('Hard reset of all players & listener')
    this.listener.reset()
    this.#playersByUrl = {}
  }
  /* c8 ignore end */

  constructor (url) {
    url = new URL(url)
    const player = Player.#playersByUrl[url.href]
    if (player) return player

    super()
    this.#url = url
    this.debug = Debug(`jonos-api:${url.hostname}`)
    Player.#playersByUrl[url.href] = this
    this.#services = [
      new ZoneGroupTopology(this),
      new AVTransport(this),
      new RenderingControl(this),
      new ContentDirectory(this)
    ]
  }

  [util.inspect.custom] () {
    return `Player { ${this.url.href} }`
  }

  get services () {
    return Object.fromEntries(this.#services.map(svc => [svc.name, svc]))
  }

  get listener () {
    return Player.listener
  }

  get isListening () {
    return this.#services.some(s => s.isListening)
  }

  get url () {
    return this.#url
  }

  exec (fn) {
    return this.#lock.exec(timeout(fn, config.apiCallTimeout))
  }

  async getDescription () {
    const url = new URL('/xml/device_description.xml', this.url)
    const fn = () => fetch(url)
    const response = await this.exec(fn)
    const text = await response.text()
    const p = Parsley.from(text)
    return {
      fullName: p.get('device')?.get('roomName')?.text,
      model: p.get('device')?.get('displayName')?.text,
      uuid: p
        .get('device')
        ?.get('UDN')
        ?.text?.replace('uuid:', '')
    }
  }

  startListening () {
    return Promise.all(this.#services.map(svc => svc.startListening()))
  }

  async stopListening () {
    if (!this.isListening) return
    return Promise.all(this.#services.map(svc => svc.stopListening()))
  }
}

/* c8 ignore next */
if (Debug('jonos-api:player').enabled) global.jonosApi = { Player }

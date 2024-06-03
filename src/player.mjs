import util from 'node:util'
import { EventEmitter } from 'node:events'

import Parsley from 'parsley'
import createSerial from 'pixutil/serial'
import timeout from 'pixutil/timeout'

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
  #serial = createSerial()
  #services

  static async discover () {
    const url = await timeout(
      this.#discovery.discoverOne(),
      config.apiDiscoveryTimeout
    )

    const p = new Player(url)
    return p.getZoneGroupState()
  }

  constructor (url) {
    url = new URL(url)
    const player = Player.#playersByUrl[url.href]
    if (player) return player

    super()
    this.#url = url
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

  get listener () {
    return Player.listener
  }

  get url () {
    return this.#url
  }

  exec (fn) {
    return this.#serial.exec(timeout(fn, config.apiCallTimeout))
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
    const startService = async svc => this.listener.register(svc)
    const forwardError = err => this.emit('error', err)

    return Promise.all(this.#services.map(startService)).catch(forwardError)
  }

  stopListening () {
    const stopService = async svc => this.listener.unregister(svc)
    const forwardError = err => this.emit('error', err)

    return Promise.all(this.#services.map(stopService)).catch(forwardError)
  }
}

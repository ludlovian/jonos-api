import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'

import Parsley from 'parsley'
import Timer from 'timer'
import timeout from 'pixutil/timeout'
import Debug from '@ludlovian/debug'
import Lock from '@ludlovian/lock'

import config from '../config.mjs'
import { cleanObject } from '../clean.mjs'

const { values } = Object

export default class Listener {
  #startStopLock = new Lock() // used to serialise starting & stopping
  #started = false
  #server
  #url
  #debug = Debug('jonos-api:listener')
  #pathToSub = new Map() // map by path

  get #allSubs () {
    return [...this.#pathToSub.values()]
  }

  get url () {
    return this.#url
  }

  get started () {
    return this.#started
  }

  hasService (srv) {
    return this.#allSubs.some(sub => sub.service.name === srv.name)
  }

  start () {
    return this.#startStopLock.exec(async () => {
      if (this.#started) return false
      const address = getMyAddress()

      this.#server = createServer(this.handleRequest.bind(this))

      const pStart = new Promise((resolve, reject) => {
        this.#server.once('error', reject)
        this.#server.listen(0, address, () => {
          const { address, port } = this.#server.address()
          this.#url = new URL(`http://${address}:${port}/`)
          this.#debug('Listener started on port %d', port)
          resolve()
        })
      })

      await timeout(pStart, config.apiCallTimeout)

      this.#started = true
      return true
    })
  }

  async stop () {
    return this.#startStopLock.exec(async () => {
      if (!this.#started) return false

      const allSubs = [...this.#allSubs]
      if (allSubs.length) {
        this.#debug('Stop called with %d subs active', allSubs.length)
        await Promise.all(allSubs.map(sub => sub.unsubscribe()))
        this.#pathToSub.clear()
      }

      const pStop = new Promise((resolve, reject) => {
        this.#server.close(err => {
          if (err) return reject(err)
          resolve()
        })
      })

      await timeout(pStop, config.apiCallTimeout)

      this.#started = false
      this.#debug('Listener stopped')
      return true
    })
  }

  async register (service) {
    await this.start()

    if (service.systemWide && this.hasService(service)) return

    const sub = new Subscription(this, service)
    service.subscription = sub

    const path = sub.path
    this.#pathToSub.set(path, sub)
    this.#debug('%s registered', path)
    await sub.subscribe()
  }

  async unregister (service) {
    const sub = service.subscription
    if (!sub) {
      if (service.systemWide) return undefined
      this.#debug('Service was never registered: %o', service)
      return
    }
    service.subscription = undefined
    await sub.unsubscribe()
    this.#pathToSub.delete(sub.path)
    this.#debug('%s unregistered', sub.path)
    if (this.#pathToSub.size === 0) await this.stop()
  }

  async handleRequest (req, res) {
    const sub = this.#pathToSub.get(req.url)
    if (!sub) {
      console.error('Received unexpected event to: %s', req.url)
      res.writeHead(412)
      return res.end()
    }

    req.setEncoding('utf8')
    let body = ''
    for await (const chunk of req) body += chunk
    req.body = body

    try {
      sub.handleRequest(req, res)
      res.end()
    } catch (err) {
      sub.player.emit('error', err)
      res.writeHead(err.statusCode ?? 500)
      return res.end()
    }
  }
}

class Subscription {
  #listener
  #service
  #tmRenew
  #sid

  constructor (listener, service) {
    this.#listener = listener
    this.#service = service
  }

  get player () {
    return this.#service.player
  }

  get service () {
    return this.#service
  }

  get debug () {
    return this.#service.debug
  }

  get path () {
    const playerHost = this.player.url.hostname
    return `/${playerHost}/${this.#service.name}`
  }

  get url () {
    return new URL(this.path, this.#listener.url)
  }

  get endpoint () {
    return new URL(`/${this.#service.path}/Event`, this.player.url)
  }

  async subscribe () {
    const headers = {
      callback: `<${this.url.href}>`,
      NT: 'upnp:event',
      Timeout: config.apiSubscriptionTimeout
    }

    const method = 'SUBSCRIBE'
    const fn = () => fetch(this.endpoint, { method, headers })
    const resp = await this.player.exec(fn)
    const forwardErr = err => this.player.emit('error', err)
    this.#sid = resp.headers.get('sid')
    this.debug('Subscribed %s', this.service.name)

    this.#tmRenew = new Timer({
      ms: config.apiSubscriptionRenew,
      fn: () => this.renew().catch(forwardErr)
    })
  }

  async renew () {
    const headers = {
      sid: this.#sid,
      Timeout: config.apiSubscriptionTimeout
    }
    const method = 'SUBSCRIBE'
    const fn = () => fetch(this.endpoint, { method, headers })
    const resp = await this.player.exec(fn)
    this.#sid = resp.headers.get('sid')
    this.#tmRenew.refresh()
    this.debug('Renewed %s', this.service.name)
  }

  async unsubscribe () {
    this.#tmRenew.cancel()

    const headers = { sid: this.#sid }
    const method = 'UNSUBSCRIBE'
    const fn = () => fetch(this.endpoint, { method, headers })

    await this.player.exec(fn)
    this.debug('Unsubscribed %s', this.service.name)
  }

  handleRequest (req, res) {
    const sid = req.headers.sid
    if (sid !== this.#sid) {
      const err = new Error(`Unexpected SID recevied: ${sid}`)
      err.statusCode = 412
      throw err
    }

    this.debug('%s event received', this.service.name)

    let elem = Parsley.from(req.body)
    let out = {}
    let data = cleanObject(this.#service.parseEvent(elem) ?? {})
    if (data) out = { ...out, ...data }

    const lastChange = elem.find('LastChange')
    if (lastChange && lastChange.isText) {
      elem = Parsley.from(lastChange.text)
      data = cleanObject(this.#service.parseEvent(elem) ?? {})
      if (data) out = { ...out, ...data }
    }
    out = cleanObject(out)
    if (!out) return

    const typ = this.#service.systemWide ? 'system' : 'player'
    this.player.emit(typ, out)
  }
}

function getMyAddress () {
  const ifaces = networkInterfaces()

  for (const iface of values(ifaces).flat()) {
    if (!iface.internal && iface.family === 'IPv4') {
      return iface.address
    }
  }
}

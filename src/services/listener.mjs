import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'

import Parsley from 'parsley'
import Timer from 'timer'
import Debug from '@ludlovian/debug'

import config from '../config.mjs'
import { cleanObject } from '../clean.mjs'

const { values } = Object

export default class Listener {
  #started = false
  #server
  #url
  #debug = Debug('jonos-api:listener')
  #pathToSub = {} // map by path

  get #allSubs () {
    return values(this.#pathToSub)
  }

  get url () {
    return this.#url
  }

  hasService (srv) {
    return this.#allSubs.some(s => s.name === srv.name)
  }

  async start () {
    if (this.#started) return
    this.#started = true
    const address = getMyAddress()

    this.#server = createServer(this.handleRequest.bind(this))
    return new Promise((resolve, reject) => {
      this.#server.once('error', reject)
      this.#server.listen(0, address, () => {
        const { address, port } = this.#server.address()
        this.#url = new URL(`http://${address}:${port}/`)
        this.#debug('Listener started on port %d', port)
        resolve(this)
      })
    })
  }

  async stop () {
    if (!this.#started) return
    const allSubs = [...this.#allSubs]
    this.#pathToSub = {}
    this.#server.close()

    await Promise.all(allSubs.map(sub => sub.unsubscribe()))
    this.#debug('Listener stopped')
  }

  async register (service) {
    await this.start()
    if (service.systemWide && this.hasService(service)) return

    const sub = new Subscription(this, service)
    const path = sub.path
    this.#pathToSub[path] = sub
    await sub.subscribe()
    this.#debug('%s registered', path)
  }

  async handleRequest (req, res) {
    const sub = this.#pathToSub[req.url]
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
  #debug

  constructor (listener, service) {
    this.#listener = listener
    this.#service = service
    this.#debug = Debug(`jonos-api:${this.path}`)
  }

  get player () {
    return this.#service.player
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
    this.#sid = resp.headers.get('sid')
    this.#debug('Subscribed')

    this.#tmRenew = new Timer({
      ms: config.apiSubscriptionRenew,
      fn: () => this.renew().catch(err => this.player.emit('error', err))
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
    this.#debug('Renewed')
  }

  async unsubscribe () {
    this.#tmRenew.cancel()

    const headers = { sid: this.#sid }
    const method = 'UNSUBSCRIBE'
    const fn = () => fetch(this.endpoint, { method, headers })
    const forwardErr = err => this.player.emit('error', err)

    await this.player.exec(fn).catch(forwardErr)
    this.#debug('Unsubscribed')
  }

  handleRequest (req, res) {
    const sid = req.headers.sid
    if (sid !== this.#sid) {
      const err = new Error(`Unexpected SID recevied: ${sid}`)
      err.statusCode = 412
      throw err
    }

    this.#debug('Event received')

    let elem = Parsley.from(req.body)
    const embeddedXML = elem.find('LastChange')?.text
    if (embeddedXML && embeddedXML.isText) {
      elem = Parsley.from(embeddedXML)
    }
    let data = this.#service.parseEvent(elem)
    if (!data) return

    data = cleanObject(data)
    if (!data) return

    const typ = this.#service.systemWide ? 'system' : 'player'
    this.player.emit(typ, data)
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

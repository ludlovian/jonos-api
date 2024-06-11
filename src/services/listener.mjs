import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'

import timeout from '@ludlovian/timeout'
import Debug from '@ludlovian/debug'
import Lock from '@ludlovian/lock'

import config from '../config.mjs'

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

  hasService (serviceName) {
    return this.#allSubs.some(sub => sub.service.name === serviceName)
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
      /* c8 ignore next */
      if (!this.#started) return false

      const allSubs = [...this.#allSubs]
      /* c8 ignore start */
      if (allSubs.length) {
        console.error(
          'Listener.stop called with %d subs active',
          allSubs.length
        )
        this.#pathToSub.clear()
      }
      /* c8 ignore end */

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

  registerPath (path, sub) {
    this.#pathToSub.set(path, sub)
  }

  async unregisterPath (path) {
    this.#pathToSub.delete(path)
    if (this.#pathToSub.size === 0) await this.stop()
  }

  async handleRequest (req, res) {
    const sub = this.#pathToSub.get(req.url)
    /* c8 ignore start */
    if (!sub) {
      console.error('Received unexpected event to: %s', req.url)
      res.writeHead(412)
      return res.end()
    }
    /* c8 ignore end */

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

function getMyAddress () {
  const ifaces = networkInterfaces()

  for (const iface of values(ifaces).flat()) {
    if (!iface.internal && iface.family === 'IPv4') {
      return iface.address
    }
  }
}

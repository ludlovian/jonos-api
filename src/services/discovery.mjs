import dgram from 'node:dgram'
import { once, EventEmitter } from 'node:events'

import Lock from '@ludlovian/lock'

export default class Discovery {
  #discoveryLock = new Lock()
  #emitter
  #socket

  #searchBuffer = Buffer.from(
    [
      'M-SEARCH * HTTP/1.1',
      'HOST: 239.255.255.250:1900',
      'MAN: ssdp:discover',
      'MX: 1',
      'ST: urn:schemas-upnp-org:device:ZonePlayer:1'
    ].join('\r\n')
  )

  #addrs = ['239.255.255.250', '255.255.255.255']

  #setup () {
    this.#emitter = new EventEmitter()
  }

  #teardown () {
    this.#emitter = this.#socket = undefined
  }

  #handleResponse (buffer, rinfo) {
    const str = buffer.toString('utf8')

    const rgxRincon = /^X-RINCON/m
    const rgxLocation = /^LOCATION:\s*(\S+)/m

    /* c8 ignore next */
    if (!rgxRincon.test(str)) return undefined

    const m = rgxLocation.exec(str)
    /* c8 ignore next */
    if (!m) return undefined

    const href = m[1]

    this.#emitter.emit('done', new URL('/', href))
  }

  #bindSocket () {
    return new Promise((resolve, reject) => {
      this.#socket.once('error', reject).bind(() => {
        this.#socket.setBroadcast(true)
        resolve()
      })
    })
  }

  #closeSocket () {
    return new Promise((resolve, reject) => {
      this.#socket.once('error', reject).close(resolve)
    })
  }

  #sendBroadcast () {
    for (const addr of this.#addrs) {
      this.#socket.send(
        this.#searchBuffer,
        0,
        this.#searchBuffer.length,
        1900,
        addr
      )
    }
  }

  discoverOne () {
    return this.#discoveryLock.exec(async () => {
      this.#setup()

      this.#socket = dgram.createSocket('udp4')
      this.#socket
        .on('error', err => this.#emitter.emit('error', err))
        .on('message', (...args) => this.#handleResponse(...args))

      const pDone = once(this.#emitter, 'done')

      await this.#bindSocket()
      this.#sendBroadcast()

      const url = await pDone
      await this.#closeSocket()
      this.#teardown()

      return url
    })
  }
}

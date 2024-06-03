import dgram from 'node:dgram'
import { EventEmitter } from 'node:events'

export default class Discovery {
  #emitter = new EventEmitter()
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

  #untilDone () {
    return new Promise((resolve, reject) => {
      this.#emitter.once('error', reject)
      this.#emitter.once('done', resolve)
    })
  }

  #handleResponse (buffer, rinfo) {
    const str = buffer.toString('utf8')

    const rgxRincon = /^X-RINCON/m
    const rgxLocation = /^LOCATION:\s*(\S+)/m

    if (!rgxRincon.test(str)) return undefined

    const m = rgxLocation.exec(str)
    if (!m) return undefined

    const href = m[1]

    this.#emitter.emit('done', new URL('/', href))
  }

  #bindSocket () {
    return new Promise((resolve, reject) => {
      this.#socket.once('error', reject)
      this.#socket.bind(() => {
        this.#socket.setBroadcast(true)
        resolve()
      })
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

  async discoverOne () {
    this.#socket = dgram.createSocket('udp4')
    this.#socket
      .on('error', err => this.#emitter.emit('error', err))
      .on('message', (...args) => this.#handleResponse(...args))

    const pDone = this.#untilDone()

    await this.#bindSocket()
    this.#sendBroadcast()

    const url = await pDone
    this.#socket.close()
    return url
  }
}

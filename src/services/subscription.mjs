// Subscription
//
// A 1:1 extension of a Service instance, controlling the
// subscription & event handling
//
import Parsley from '@ludlovian/parsley'
import Timer from '@ludlovian/timer'

import config from '../config.mjs'

export default class Subscription {
  #service
  #sid
  #tmRenew

  constructor (service) {
    this.#service = service
  }

  // derived attributes

  get player () {
    return this.#service.player
  }

  get service () {
    return this.#service
  }

  get listener () {
    return this.player.listener
  }

  get debug () {
    return this.#service.debug
  }

  get path () {
    const playerHost = this.player.url.hostname
    return `/${playerHost}/${this.#service.name}`
  }

  get url () {
    return new URL(this.path, this.listener.url)
  }

  get endpoint () {
    return new URL(`/${this.#service.path}/Event`, this.player.url)
  }

  // subscription & renewals
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
    this.debug('%s subscribed', this.service.name)

    this.#tmRenew = new Timer({
      ms: config.apiSubscriptionRenew,
      fn: () => this.renew().catch(forwardErr)
    })
  }

  // not tested as it would take too long!
  /* c8 ignore start */
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
    this.debug('%s renewed', this.service.name)
  }
  /* c8 ignore end */

  async unsubscribe () {
    this.#tmRenew.cancel()

    const headers = { sid: this.#sid }
    const method = 'UNSUBSCRIBE'
    const fn = () => fetch(this.endpoint, { method, headers })

    await this.player.exec(fn)
    this.debug('%s unsubscribed', this.service.name)
  }

  handleRequest (req, res) {
    const sid = req.headers.sid
    // defensive check: should never happen
    /* c8 ignore start */
    if (sid !== this.#sid) {
      const err = new Error(`Unexpected SID recevied: ${sid}`)
      err.statusCode = 412
      throw err
    }
    /* c8 ignore end */

    const name = this.service.name
    const xmlName = name + ':xml'
    this.debug('%s event received', name)

    // emit the complete element
    const elem = Parsley.from(req.body)
    this.player.emit(xmlName, elem)

    // emit the lastChange if given
    const lastChange = elem.find('LastChange')
    if (lastChange && lastChange.isText) {
      const elem = Parsley.from(lastChange.text)
      this.player.emit(xmlName, elem)
    }
  }
}

import { suite, before, after } from 'node:test'

import helper from './helper.mjs'

suite('jonos-api', { concurrency: false }, async () => {
  before(helper.before)
  after(helper.after)

  suite('api', async () => {
    await import('./setup.mjs')
    await import('./renderingControl.mjs')
  })

  suite('events', async () => {
    before(async () => {
      // start a random service to keep the listener open
      const name = 'archive'
      const svcName = 'RenderingControl'
      const player = helper.playerByName[name]
      const svc = player.services[svcName]
      await svc.startListening()
    })

    await import('./renderingControlEvent.mjs')
  })
})

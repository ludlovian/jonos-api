import { suite, before, after } from 'node:test'

import helper from './helper.mjs'

suite('jonos-api', { concurrency: false }, async () => {
  before(helper.before)
  after(helper.after)
  // tests that don't need the harness
  await import('./parsers.mjs')
  // test the harness
  await import('./setup.mjs')
  // player tests
  await import('./player.mjs')
  await import('./zoneGroupTopology.mjs')
  await import('./renderingControl.mjs')
  await import('./avTransport.mjs')
  await import('./event.mjs')
})

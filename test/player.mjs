import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import Player from '../src/player.mjs'
import setup from './helpers/setup.mjs'

suite('Player', async t => {
  let ctx
  before(async () => (ctx = await setup()))
  after(async () => ctx.stop())

  await test('construction', async () => {
    const url = ctx.byName.study.url
    const p = new Player(url)

    assert.ok(p.url instanceof URL)
    assert.ok(p.url.href === url)
    assert.ok(p === ctx.byName.study.api, 'Instances are re=used')
  })
})

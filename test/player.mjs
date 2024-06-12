import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { inspect } from 'node:util'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('Player', async t => {
  const name = 'study'
  let player
  before(async () => {
    await helper.before()
    player = new Player(helper.urlByName[name])
  })
  after(helper.after)

  await test('construction', async () => {
    assert.ok(player instanceof Player)
    assert.ok(player.url instanceof URL)
    assert.ok(player === helper.playerByName[name])
  })

  test('representation', () => {
    const url = helper.urlByName[name]
    const exp = `Player { ${url} }`
    const act = inspect(player)
    assert.strictEqual(act, exp)
  })

  test('description', async () => {
    const res = await player.getDescription()
    assert.ok(typeof res.fullName === 'string')
    assert.ok(typeof res.model === 'string')
    assert.ok(typeof res.uuid === 'string')
    assert.strictEqual(res.uuid, helper.uuidByName[name])
  })

  test('start & stop listening', async () => {
    await player.startListening()
    await player.startListening()

    await player.stopListening()
    await player.stopListening()
  })
})

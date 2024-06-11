import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('Setup', async t => {
  before(helper.before)
  after(helper.after)

  await test('setup works', async () => {
    const name = 'study'
    const player = helper.playerByName[name]
    assert.ok(player instanceof Player)

    assert.ok(helper.allNames.includes(name))

    const url = helper.urlByName[name]
    assert.ok(typeof url === 'string')

    const uuid = helper.uuidByName[name]
    assert.ok(typeof uuid === 'string')

    const name2 = helper.nameByUuid[uuid]
    assert.ok(name === name2)

    const leader = await helper.leaderOf(player)
    const leader2 = await helper.leaderOf(name)
    assert.ok(leader === leader2)
    assert.ok(leader === '' || helper.allNames.includes(leader))
  })
})

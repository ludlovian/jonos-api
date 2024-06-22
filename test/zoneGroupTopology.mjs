import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('ZoneGroupTopology', t => {
  const name = 'study'
  let player
  before(async () => {
    await helper.before()
    player = new Player(helper.urlByName[name])
  })
  after(helper.after)

  test('getZoneGroupState', async () => {
    const currState = await player.getZoneGroupState()

    const players = currState.players
    assert.ok(Array.isArray(players))

    const entry = players[0]

    assert.ok(typeof entry.url === 'string')
    assert.ok(typeof entry.uuid === 'string')
    assert.ok(typeof entry.fullName === 'string')
    assert.ok(typeof entry.leaderUuid === 'string')
  })

  test('getCurrentGroup', async () => {
    const data = await player.getCurrentGroup()

    assert.ok(typeof data.leaderUuid === 'string')
    assert.ok(Array.isArray(data.memberUuids))
    assert.ok(data.memberUuids.includes(data.leaderUuid))
    assert.ok(data.memberUuids.includes(helper.uuidByName[name]))
  })
})

import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('Event', () => {
  let player
  const name = 'study'
  const pEvent = {}

  before(async () => {
    await helper.before()
    player = new Player(helper.urlByName[name])
    for (const svcName of Object.keys(player.services)) {
      pEvent[svcName] = once(player, svcName)
    }
    await player.startListening()
  })

  after(helper.after)

  test('ZoneGroupTopology', async () => {
    const svcName = 'ZoneGroupTopology'
    const [data] = await pEvent[svcName]

    assert.ok(Array.isArray(data.players))
  })

  test('AVTransport', async () => {
    const svcName = 'AVTransport'
    const [data] = await pEvent[svcName]

    assert.ok(typeof data.playState === 'string')
  })

  test('RenderingControl', async () => {
    const svcName = 'RenderingControl'
    const [data] = await pEvent[svcName]

    assert.ok(typeof data.volume === 'number')
    assert.ok(typeof data.mute === 'boolean')
  })
})

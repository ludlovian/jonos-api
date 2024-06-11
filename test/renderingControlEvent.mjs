import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('RenderingControlEvent', () => {
  let player
  const name = 'study'
  const svcName = 'RenderingControl'
  let svc
  const prev = {}
  const curr = {}
  const update = data => Object.assign(curr, data)

  before(async () => {
    await helper.before()
    player = new Player(helper.urlByName[name])
    svc = player.services[svcName]
    if (svc.isListening) await svc.stopListening()
    Object.assign(prev, await player.getVolume())
    Object.assign(prev, await player.getMute())
    player.on(svcName, update)
  })

  after(async () => {
    player.off(svcName, update)
    await svc.stopListening()
    await player.setVolume(prev.volume)
    await player.setMute(prev.mute)
    await helper.after()
  })

  test('events', async () => {
    let pEvent
    await svc.startListening()

    pEvent = once(player, svcName)
    const newVolume = prev.volume - 1
    await player.setVolume(newVolume)
    await pEvent
    assert.strictEqual(curr.volume, newVolume)

    pEvent = once(player, svcName)
    const newMute = !prev.mute
    await player.setMute(newMute)
    await pEvent
    assert.strictEqual(curr.mute, newMute)
  })
})

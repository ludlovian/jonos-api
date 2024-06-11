import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('RenderingControl', () => {
  const name = 'study'
  let player
  before(async () => {
    await helper.before()
    player = new Player(helper.urlByName[name])
  })
  after(helper.after)

  test('volume', async () => {
    const prevVolume = (await player.getVolume()).volume
    assert.ok(typeof prevVolume === 'number')

    const newVolume = prevVolume - 1
    await player.setVolume(newVolume)

    assert.strictEqual((await player.getVolume()).volume, newVolume)

    await player.setVolume(prevVolume)
  })

  test('mute', async () => {
    const prevMute = (await player.getMute()).mute
    assert.ok(typeof prevMute === 'boolean')

    const newMute = !prevMute
    await player.setMute(newMute)

    assert.strictEqual((await player.getMute()).mute, newMute)

    await player.setMute(prevMute)
  })
})

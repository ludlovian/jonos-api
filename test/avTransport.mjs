import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('AVTransport', () => {
  const name = 'study'
  const mediaUri = [
    'x-file-cifs://data2.local/data/Adrian-Chandler/The-Italian-Job/track01.flac',
    'x-file-cifs://data2.local/data/Adrian-Chandler/The-Italian-Job/track02.flac'
  ]
  let player
  before(async () => {
    await helper.before()
    player = new Player(helper.urlByName[name])
    if ((await helper.leaderOf(player)) !== '') {
      await player.startOwnGroup()
    }
  })
  after(helper.after)

  test('set queue', async () => {
    const uuid = helper.uuidByName[name]
    await player.setAVTransportURI(`x-rincon-queue:${uuid}#0`)

    await player.emptyQueue()
    await player.addUriToQueue(mediaUri[0])
    await player.addUriToQueue(mediaUri[1])

    const { queue } = await player.getQueue()

    assert.deepStrictEqual(queue, mediaUri)
  })

  test('play & pause', async () => {
    await player.play()

    await delay(2000)

    await player.pause()
  })

  test('seek', async () => {
    await player.seekTrack(2)
    await player.seekPos('0:00:10')
    const res = await player.getPositionInfo()
    assert.strictEqual(res.trackNum, 2)
    assert.strictEqual(res.trackUri, mediaUri[1])
    assert.strictEqual(res.trackPos, '0:00:10')
  })
})

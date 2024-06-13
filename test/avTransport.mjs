import { suite, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'

import Player from '../src/player.mjs'
import helper from './helper.mjs'

suite('AVTransport', () => {
  const name = 'study'
  const tracks = [
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
    const mediaUri = `x-rincon-queue:${uuid}#0`
    const playMode = 'NORMAL'
    await player.setAVTransportURI(mediaUri)

    await player.emptyQueue()
    await player.addUriToQueue(tracks[0])
    await player.addUriToQueue(tracks[1])
    await player.setPlayMode(playMode)

    let res
    res = await player.getQueue()
    assert.deepStrictEqual(res.queue, tracks)

    res = await player.getMediaInfo()
    assert.strictEqual(res.mediaUri, mediaUri)

    res = await player.getPlayMode()
    assert.strictEqual(res.playMode, playMode)
  })

  test('play & pause', async () => {
    await player.play()

    await delay(2000)
    const res = await player.getTransportInfo()
    assert.strictEqual(res.isPlaying, true)

    await player.pause()
  })

  test('seek', async () => {
    const trackPos = 10 * 1000
    const trackNum = 2

    await player.seekTrack(trackNum)
    await player.seekPos(trackPos)

    const res = await player.getPositionInfo()
    assert.strictEqual(res.trackNum, trackNum)
    assert.strictEqual(res.trackUri, tracks[1])
    assert.strictEqual(res.trackPos, trackPos)
  })

  test('groups', async () => {
    const leader = 'bookroom'
    const uuid = helper.uuidByName[leader]

    await player.joinGroup(uuid)
    await player.startOwnGroup()
  })
})

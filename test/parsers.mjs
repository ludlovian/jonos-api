import { suite, test } from 'node:test'
import assert from 'node:assert/strict'

import {
  parsePlayState,
  parseZoneGroupState,
  parseQueue,
  parseDuration,
  formatDuration
} from '../src/parsers.mjs'

suite('parsers', { concurrency: false }, () => {
  suite('parsePlayState', () => {
    let playState
    let exp
    let act
    test('playing states', () => {
      playState = 'PLAYING'
      exp = { isPlaying: true }
      act = parsePlayState(playState)
      assert.deepStrictEqual(act, exp)

      playState = 'TRANSITIONING'
      exp = { isPlaying: true }
      act = parsePlayState(playState)
      assert.deepStrictEqual(act, exp)
    })

    test('non-playing states', () => {
      playState = 'blah'
      exp = { isPlaying: false }
      act = parsePlayState(playState)
      assert.deepStrictEqual(act, exp)
    })

    test('undefined', () => {
      playState = undefined
      exp = {}
      act = parsePlayState(playState)
      assert.deepStrictEqual(act, exp)
    })
  })

  suite('parseZoneGroupState', () => {
    let xml
    let exp
    let act

    test('Zone group state embedded', () => {
      xml = [
        '<ZoneGroupState>',
        '<ZoneGroup Coordinator="uuid1">',
        '<ZoneGroupMember Location="http://url1/blah" UUID="uuid1" ZoneName="name1" />',
        '<ZoneGroupMember Location="http://url2/blah" UUID="uuid2" ZoneName="name2" />',
        '</ZoneGroup>',
        '<ZoneGroup Coordinator="uuid3">',
        '<ZoneGroupMember Location="http://url3/blah" UUID="uuid3" ZoneName="name3" Invisible="1" />',
        '</ZoneGroup>',
        '</ZoneGroupState>'
      ].join('')
      exp = {
        players: [
          {
            url: 'http://url1/',
            uuid: 'uuid1',
            fullName: 'name1',
            leaderUuid: 'uuid1'
          },
          {
            url: 'http://url2/',
            uuid: 'uuid2',
            fullName: 'name2',
            leaderUuid: 'uuid1'
          }
        ]
      }
      act = parseZoneGroupState(xml)
      assert.deepStrictEqual(act, exp)
    })

    test('No Zone group state', t => {
      xml = ''
      exp = undefined
      act = parseZoneGroupState(xml)
      assert.deepStrictEqual(act, exp)
    })
  })

  suite('parseQueue', () => {
    let xml
    let act
    let exp
    let obj

    test('regular queue', () => {
      xml = [
        '<items>',
        '<item><res>item1</res></item>',
        '<item><res>item2</res></item>',
        '</items>'
      ].join('')
      exp = { queue: ['item1', 'item2'] }
      obj = { result: xml }

      act = parseQueue(obj)
      assert.deepStrictEqual(act, exp)
    })

    test('missing queue', () => {
      obj = {}
      exp = undefined
      act = parseQueue(obj)
      assert.deepStrictEqual(act, exp)
    })
  })

  suite('parseDuration', () => {
    let str
    let act
    let exp

    test('regular duration', () => {
      str = '1:02:03'
      exp = (1 * 3600 + 2 * 60 + 3) * 1000
      act = parseDuration(str)
      assert.strictEqual(act, exp)
    })

    test('invalid', () => {
      str = 'x'
      exp = 'x'
      act = parseDuration(str)
      assert.strictEqual(act, exp)

      str = undefined
      exp = undefined
      act = parseDuration(str)
      assert.strictEqual(act, exp)
    })

    test('no hours', () => {
      str = '02:03'
      exp = (2 * 60 + 3) * 1000
      act = parseDuration(str)
      assert.strictEqual(act, exp)
    })

    test('no mins', () => {
      str = '03'
      exp = 3 * 1000
      act = parseDuration(str)
      assert.strictEqual(act, exp)
    })
  })

  suite('formatDuration', () => {
    let ms
    let act
    let exp

    test('regular', () => {
      ms = (1 * 3600 + 2 * 60 + 3) * 1000
      exp = '1:02:03'
      act = formatDuration(ms)
      assert.strictEqual(act, exp)
    })
  })
})

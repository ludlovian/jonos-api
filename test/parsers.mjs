import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import Parsley from '@ludlovian/parsley'

import {
  parsePlayState,
  parseMetadata,
  parseZoneGroupTopology,
  parseQueue
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

  suite('parseMetadata', () => {
    let xml
    let exp
    let act
    test('full set', () => {
      xml = [
        '<foo>',
        '<r:streamContent>title</r:streamContent>',
        '<dc:title>title2</dc:title>',
        '<upnp:album>album</upnp:album>',
        '<upnp:originalTrackNumber>17</upnp:originalTrackNumber>',
        '<r:albumArtist>albumArtist</r:albumArtist>',
        '<dc:creator>artist</dc:creator>',
        '</foo>'
      ].join('')
      exp = {
        trackDetails: {
          title: 'title',
          album: 'album',
          trackNumber: 17,
          albumArtist: 'albumArtist',
          artist: 'artist'
        }
      }

      act = parseMetadata(xml)
      assert.deepStrictEqual(act, exp)
    })

    test('no stream Content', () => {
      xml = [
        '<foo>',
        '<dc:title>title2</dc:title>',
        '<upnp:album>album</upnp:album>',
        '<upnp:originalTrackNumber>17</upnp:originalTrackNumber>',
        '<r:albumArtist>albumArtist</r:albumArtist>',
        '<dc:creator>artist</dc:creator>',
        '</foo>'
      ].join('')
      exp = {
        trackDetails: {
          title: 'title2',
          album: 'album',
          trackNumber: 17,
          albumArtist: 'albumArtist',
          artist: 'artist'
        }
      }

      act = parseMetadata(xml)
      assert.deepStrictEqual(act, exp)
    })

    test('empty XML object', () => {
      xml = '<foo />'
      exp = {}
      act = parseMetadata(xml)
      assert.deepStrictEqual(act, exp)
    })

    test('other invalids', () => {
      xml = 'NOT_IMPLEMENTED'
      exp = {}
      act = parseMetadata(xml)
      assert.deepStrictEqual(act, exp)

      xml = 'foobar'
      exp = {}
      act = parseMetadata(xml)
      assert.deepStrictEqual(act, exp)

      xml = ''
      exp = {}
      act = parseMetadata(xml)
      assert.deepStrictEqual(act, exp)

      xml = undefined
      exp = {}
      act = parseMetadata(xml)
      assert.deepStrictEqual(act, exp)
    })
  })

  suite('parseZoneGroupTopology', () => {
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
            leaderUuid: ''
          },
          {
            url: 'http://url2/',
            uuid: 'uuid2',
            fullName: 'name2',
            leaderUuid: 'uuid1'
          }
        ]
      }
      const elem = Parsley.create('ZoneGroupState', {}, [xml])
      act = parseZoneGroupTopology(elem)
      assert.deepStrictEqual(act, exp)
    })

    test('Zone group state unpacked', t => {
      xml = [
        '<foo>',
        '<ZoneGroupState>',
        '<ZoneGroup Coordinator="uuid1">',
        '<ZoneGroupMember Location="http://url1/blah" UUID="uuid1" ZoneName="name1" />',
        '<ZoneGroupMember Location="http://url2/blah" UUID="uuid2" ZoneName="name2" />',
        '</ZoneGroup>',
        '<ZoneGroup Coordinator="uuid3">',
        '<ZoneGroupMember Location="http://url3/blah" UUID="uuid3" ZoneName="name3" Invisible="1" />',
        '</ZoneGroup>',
        '</ZoneGroupState>',
        '</foo>'
      ].join('')
      exp = {
        players: [
          {
            url: 'http://url1/',
            uuid: 'uuid1',
            fullName: 'name1',
            leaderUuid: ''
          },
          {
            url: 'http://url2/',
            uuid: 'uuid2',
            fullName: 'name2',
            leaderUuid: 'uuid1'
          }
        ]
      }
      const elem = Parsley.from(xml)
      act = parseZoneGroupTopology(elem)
      assert.deepStrictEqual(act, exp)
    })

    test('No Zone group state', t => {
      xml = ['<foo>', '</foo>'].join('')
      exp = undefined
      const elem = Parsley.from(xml)
      act = parseZoneGroupTopology(elem)
      assert.deepStrictEqual(act, exp)
    })
  })

  suite('parseQueue', () => {
    let xml
    let act
    let exp

    test('regular queue', () => {
      xml = [
        '<items>',
        '<item><res>item1</res></item>',
        '<item><res>item2</res></item>',
        '</items>'
      ].join('')
      exp = { queue: ['item1', 'item2'] }

      const wrappedXml =
        '<foo><Result>' + Parsley.encode(xml) + '</Result></foo>'

      act = parseQueue(Parsley.from(wrappedXml))
      assert.deepStrictEqual(act, exp)
    })

    test('missing queue', () => {
      xml = '<foo />'
      exp = undefined
      act = parseQueue(Parsley.from(xml))
      assert.deepStrictEqual(act, exp)
    })
  })
})

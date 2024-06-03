import Parsley from 'parsley'

import convert from '../convert.mjs'
import { cleanObject } from '../clean.mjs'
import SonosService from './service.mjs'

export default class AVTransport extends SonosService {
  static name = 'AVTransport'
  static path = 'MediaRenderer/AVTransport'

  static commands = [
    'getPositionInfo',
    'getMediaInfo',
    'getTransportInfo',
    'getPlayMode',
    'setAVTransportURI',
    'seekTrack',
    'seekPos',
    'pause',
    'play',
    'setPlayMode',
    'joinGroup',
    'startOwnGroup',
    'emptyQueue',
    'addUriToQueue'
  ]

  getPositionInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetPositionInfo', parms, elem => {
      return {
        trackNum: convert(elem.find('Track')?.text),
        trackUri: elem.find('TrackURI')?.text,
        trackPos: elem.find('RelTime')?.text,
        trackMetadata: this.parseMetadata(elem.find('TrackMetaData')?.text)
      }
    })
  }

  getMediaInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetMediaInfo', parms, elem => {
      return {
        mediaUri: elem.find('CurrentURI')?.text,
        mediaMetadata: elem.find('CurrentURIMetaData')?.text
      }
    })
  }

  getTransportInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetTransportInfo', parms, elem => {
      const playState = elem.find('CurrentTransportState')?.text
      const isPlaying = checkPlayState(playState)
      return { playState, isPlaying }
    })
  }

  getPlayMode () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetTransportSettings', parms, elem => {
      return {
        playMode: elem.find('PlayMode')?.text
      }
    })
  }

  setAVTransportURI (uri, metadata = '') {
    const parms = {
      InstanceID: 0,
      CurrentURI: uri,
      CurrentURIMetaData: metadata
    }
    return this.callSOAP('SetAVTransportURI', parms)
  }

  seekTrack (trackNum) {
    const parms = { InstanceID: 0, Unit: 'TRACK_NR', Target: trackNum }
    return this.callSOAP('Seek', parms)
  }

  seekPos (relTime) {
    const parms = { InstanceID: 0, Unit: 'REL_TIME', Target: relTime }
    return this.callSOAP('Seek', parms)
  }

  pause () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('Pause', parms)
  }

  play () {
    const parms = { InstanceID: 0, Speed: '1' }
    return this.callSOAP('Play', parms)
  }

  setPlayMode (playMode) {
    const parms = {
      InstanceID: 0,
      NewPlayMode: playMode
    }
    return this.callSOAP('SetPlayMode', parms)
  }

  joinGroup (uuid) {
    return this.setAVTransportURI(`x-rincon:${uuid}`)
  }

  startOwnGroup () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('BecomeCoordinatorOfStandaloneGroup', parms)
  }

  emptyQueue () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('RemoveAllTracksFromQueue', parms)
  }

  addUriToQueue (uri, metadata = '') {
    const parms = {
      InstanceID: 0,
      EnqueuedURI: uri,
      EnqueuedURIMetaData: metadata,
      DesiredFirstTrackNumberEnqueued: 0,
      EnqueueAsNext: 0
    }
    return this.callSOAP('AddURIToQueue', parms)
  }

  parseEvent (elem) {
    const playState = elem.find('TransportState')?.attr?.val
    const isPlaying = playState ? checkPlayState(playState) : undefined

    const trackUri = elem.find('CurrentTrackURI')?.attr?.val
    let trackMetadata = elem.find('CurrentTrackMetaData')?.attr?.val
    if (trackMetadata) trackMetadata = this.parseMetadata(trackMetadata)

    const playMode = elem.find('CurrentPlayMode')?.attr?.val

    return { playState, isPlaying, trackUri, trackMetadata, playMode }
  }

  parseMetadata (text) {
    if (!text) return undefined

    if (text === 'NOT_IMPLEMENTED') return undefined
    const elem = Parsley.from(text.trim(), { safe: true })
    if (!elem) return text

    const title =
      elem.find('r:streamContent')?.text ?? elem.find('dc:title')?.text
    const album = elem.find('upnp:album')?.text
    const trackNumber = convert(elem.find('upnp:originalTrackNumber')?.text)
    const albumArtist = elem.find('r:albumArtist')?.text
    const artist = elem.find('dc:creator')?.text
    let albumArtUri = elem.find('upnp:albumArtURI')?.text
    if (albumArtUri) {
      albumArtUri = new URL(albumArtUri, this.player.url).href
    }

    return cleanObject({
      title,
      album,
      trackNumber,
      albumArtist,
      artist,
      albumArtUri
    })
  }
}

function checkPlayState (playState) {
  return playState === 'PLAYING' || playState === 'TRANSITIONING'
}

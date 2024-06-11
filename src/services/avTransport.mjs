import Parsley from '@ludlovian/parsley'
import guess from '@ludlovian/guess'

import SonosService from './service.mjs'
import cleanObject from '../clean-object.mjs'

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

  // ---------------------------------------------
  // Get functions
  //

  getPositionInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetPositionInfo', parms).then(e => {
      const out = {
        trackNum: guess(e.find('Track')?.text),
        trackUri: e.find('TrackURI')?.text,
        trackPos: e.find('RelTime')?.text,
        trackMetadata: e.find('TrackMetaData')?.text
      }
      if (out.trackMetadata) {
        out.trackDetails = this.parseMetadata(out.trackMetadata)
      }
      return out
    })
  }

  getMediaInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetMediaInfo', parms).then(e => ({
      mediaUri: e.find('CurrentURI')?.text,
      mediaMetadata: e.find('CurrentURIMetaData')?.text
    }))
  }

  getTransportInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetTransportInfo', parms).then(e => {
      const playState = e.find('CurrentTransportState')?.text
      const isPlaying = checkPlayState(playState)
      return { playState, isPlaying }
    })
  }

  getPlayMode () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetTransportSettings', parms).then(e => ({
      playMode: e.find('PlayMode')?.text
    }))
  }

  // ---------------------------------------------
  // AV transport setting

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

  // ---------------------------------------------
  // Queue setting

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

  // ---------------------------------------------
  // Event parsing

  parseXmlEvent (elem) {
    const out = {
      playState: elem.find('TransportState')?.attr?.val,
      trackUri: elem.find('CurrentTrackURI')?.attr?.val,
      trackMetadata: elem.find('CurrentTrackMetaData')?.attr?.val,
      playMode: elem.find('CurrentPlayMode')?.attr?.val
    }
    if (out.playState) out.isPlaying = checkPlayState(out.playState)
    if (out.trackMetadata) {
      out.trackDetails = this.parseMetadata(out.trackMetadata)
    }

    return out
  }

  parseMetadata (text) {
    if (!text || text === 'NOT_IMPLEMENTED') return undefined
    const elem = Parsley.from(text.trim(), { safe: true })
    if (!elem) return undefined

    const title =
      elem.find('r:streamContent')?.text ?? elem.find('dc:title')?.text
    const album = elem.find('upnp:album')?.text
    const trackNumber = guess(elem.find('upnp:originalTrackNumber')?.text)
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

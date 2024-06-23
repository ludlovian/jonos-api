import guess from '@ludlovian/guess'

import SonosService from './service.mjs'
import C from '../constants.mjs'

import { parsePlayState, parseDuration, formatDuration } from '../parsers.mjs'

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
    return this.callSOAP('GetPositionInfo', parms).then(d => ({
      trackNum: guess(d.track),
      trackUrl: d.trackUri,
      trackMetadata: d.trackMetaData,
      trackPos: parseDuration(d.relTime),
      trackDuration: parseDuration(d.trackDuration)
    }))
  }

  getMediaInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetMediaInfo', parms).then(d => ({
      mediaUri: d.currentUri,
      mediaMetadata: d.currentUriMetaData
    }))
  }

  getTransportInfo () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetTransportInfo', parms).then(d => ({
      playState: d.currentTransportState,
      ...parsePlayState(d.currentTransportState)
    }))
  }

  getPlayMode () {
    const parms = { InstanceID: 0 }
    return this.callSOAP('GetTransportSettings', parms).then(d => ({
      playMode: d.playMode
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
    const parms = {
      InstanceID: 0,
      Unit: 'REL_TIME',
      Target: formatDuration(relTime)
    }
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
    return this.setAVTransportURI(C.FOLLOW + uuid)
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

  parseEvent (data) {
    return {
      playState: data.transportState,
      ...parsePlayState(data.transportState),
      trackUrl: data.currentTrackUri,
      trackMetadata: data.currentTrackMetaData,
      trackDuration: parseDuration(data.currentTrackDuration),
      playMode: data.currentPlayMode
    }
  }
}

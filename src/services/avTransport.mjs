import guess from '@ludlovian/guess'

import SonosService from './service.mjs'
import { parsePlayState, parseMetadata } from '../parsers.mjs'

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
      const trackMetadata = e.find('TrackMetaData')?.text
      return {
        trackNum: guess(e.find('Track')?.text),
        trackUri: e.find('TrackURI')?.text,
        trackPos: e.find('RelTime')?.text,
        trackMetadata,
        ...parseMetadata(trackMetadata)
      }
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
      return {
        playState,
        ...parsePlayState(playState)
      }
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
    const playState = elem.find('TransportState')?.attr?.val
    const trackMetadata = elem.find('CurrentTrackMetaData')?.attr?.val

    return {
      playState,
      ...parsePlayState(playState),

      trackUri: elem.find('CurrentTrackURI')?.attr?.val,
      trackMetadata,
      ...parseMetadata(trackMetadata),

      playMode: elem.find('CurrentPlayMode')?.attr?.val
    }
  }
}

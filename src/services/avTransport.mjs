import Parsley from 'parsley'

import convert from '../convert.mjs'
import { cleanObject } from '../clean.mjs'
import SonosService from './service.mjs'

export default class AVTransport extends SonosService {
  name = 'AVTransport'
  path = 'MediaRenderer/AVTransport'

  commands = ['getPositionInfo', 'getMediaInfo', 'getTransportInfo']

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
      const playing = isPlaying(playState)
      return { playState, playing }
    })
  }

  parseEvent (elem) {
    const playState = elem.find('TransportState')?.attr?.val
    const playing = playState ? isPlaying(playState) : undefined

    const trackUri = elem.find('CurrentTrackURI')?.attr?.val
    let trackMetadata = elem.find('CurrentTrackMetaData')?.attr?.val
    if (trackMetadata) trackMetadata = this.parseMetadata(trackMetadata)

    return { playState, playing, trackUri, trackMetadata }
  }

  parseMetadata (text) {
    if (!text) return undefined

    if (text === 'NOT_IMPLEMENTED') return undefined
    console.log(text)
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

function isPlaying (playState) {
  return playState === 'PLAYING' || playState === 'TRANSITIONING'
}

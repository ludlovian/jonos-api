import Parsley from '@ludlovian/parsley'
import guess from '@ludlovian/guess'

import cleanObject from './clean-object.mjs'

export function parsePlayState (playState) {
  if (playState === undefined) return {}
  return {
    isPlaying: playState === 'PLAYING' || playState === 'TRANSITIONING'
  }
}

export function parseMetadata (text) {
  if (!text || text === 'NOT_IMPLEMENTED') return {}
  const elem = Parsley.from(text.trim(), { safe: true })
  if (!elem) return {}

  let title = elem.find('r:streamContent')?.text
  if (!title) title = elem.find('dc:title')?.text
  const album = elem.find('upnp:album')?.text
  const trackNumber = guess(elem.find('upnp:originalTrackNumber')?.text)
  const albumArtist = elem.find('r:albumArtist')?.text
  const artist = elem.find('dc:creator')?.text

  const trackDetails = cleanObject({
    title,
    album,
    trackNumber,
    albumArtist,
    artist
  })

  return trackDetails ? { trackDetails } : {}
}

export function parseZoneGroupTopology (p) {
  p = p.find('ZoneGroupState')
  if (!p) return undefined

  // embedded XML
  if (p.isText) p = Parsley.from(p.text)

  const players = []

  for (const zg of p.findAll('ZoneGroup')) {
    const ldrUuid = zg.attr.Coordinator

    for (const zgm of zg.findAll('ZoneGroupMember')) {
      if (+zgm.attr.Invisible) continue
      const player = {
        url: new URL('/', zgm.attr.Location).href,
        uuid: zgm.attr.UUID,
        fullName: zgm.attr.ZoneName
      }
      player.leaderUuid = ldrUuid === player.uuid ? '' : ldrUuid
      players.push(player)
    }
  }
  return { players }
}

export function parseQueue (elem) {
  const text = elem.find('Result')?.text?.trim()
  if (!text) return undefined

  elem = Parsley.from(text)
  const queue = elem
    .findAll('item')
    .map(el => el.find('res')?.text)
    .filter(Boolean)

  return { queue }
}

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
  const trackDetails = {}
  if (!text || text === 'NOT_IMPLEMENTED') return { trackDetails }
  const elem = Parsley.from(text.trim(), { safe: true })
  if (!elem) return { trackDetails }

  let title = elem.find('r:streamContent')?.text
  if (!title) title = elem.find('dc:title')?.text
  const album = elem.find('upnp:album')?.text
  const trackNumber = guess(elem.find('upnp:originalTrackNumber')?.text)
  const albumArtist = elem.find('r:albumArtist')?.text
  const artist = elem.find('dc:creator')?.text

  Object.assign(
    trackDetails,
    cleanObject({
      title,
      album,
      trackNumber,
      albumArtist,
      artist
    }) ?? {}
  )

  return { trackDetails }
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

export function parseDuration (duration) {
  if (duration === undefined) return undefined
  const [s, m, h] = duration
    .split(':')
    .reverse()
    .map(x => +x)
  if (isNaN(s)) return duration
  const secs = s + 60 * (m ?? 0) + 60 * 60 * (h ?? 0)
  return secs * 1000
}

export function formatDuration (ms) {
  const secs = Math.round(ms / 1000)
  const mins = Math.floor(secs / 60)
  const hrs = Math.floor(mins / 60)

  const ss = (secs % 60).toString().padStart(2, '0')
  const mm = (mins % 60).toString().padStart(2, '0')
  const hh = hrs.toString()
  return `${hh}:${mm}:${ss}`
}

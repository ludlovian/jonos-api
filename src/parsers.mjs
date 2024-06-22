import Parsley from '@ludlovian/parsley'

export function parsePlayState (playState) {
  if (playState === undefined) return {}
  return {
    isPlaying: playState === 'PLAYING' || playState === 'TRANSITIONING'
  }
}

export function parseZoneGroupState (zgs) {
  if (!zgs) return undefined
  const p = Parsley.from(zgs)
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

export function parseQueue ({ result }) {
  if (!result) return undefined

  const elem = Parsley.from(result)
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

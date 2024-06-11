import Player from '../src/player.mjs'

let loaded = false
const allPlayers = []
const allNames = []
const playerByName = {}
const urlByName = {}
const uuidByName = {}
const nameByUuid = {}

async function before () {
  if (loaded) return
  loaded = true
  const discovery = await Player.discover()

  for (const { url, fullName, uuid } of discovery.players) {
    const name = fullName.replaceAll(' ', '').toLowerCase()
    const player = new Player(url)
    allPlayers.push(player)
    allNames.push(name)
    playerByName[name] = player
    urlByName[name] = url
    uuidByName[name] = uuid
    nameByUuid[uuid] = name
  }
}

async function leaderOf (nameOrPlayer) {
  const player =
    nameOrPlayer instanceof Player ? nameOrPlayer : playerByName[nameOrPlayer]
  const { players } = await player.getZoneGroupState()
  const leaderUuid =
    players.find(x => x.url === player.url.href)?.leaderUuid ?? ''
  return leaderUuid ? nameByUuid[leaderUuid] : ''
}

async function after () {
  for (const player of allPlayers) {
    if (player.isListening) await player.stopListening()
  }
}

export default {
  before,
  after,
  allPlayers,
  allNames,
  playerByName,
  urlByName,
  uuidByName,
  nameByUuid,
  leaderOf
}

import Parsley from 'parsley'

import SonosService from './service.mjs'

export default class ZoneGroupTopology extends SonosService {
  static name = 'ZoneGroupTopology'
  static path = 'ZoneGroupTopology'

  // this is a system wide service
  static systemWide = true

  static commands = ['getZoneGroupState']

  getZoneGroupState () {
    const Player = this.player.constructor
    return this.callSOAP('GetZoneGroupState', {}, p =>
      parseZoneGroupTopology(p, Player)
    )
  }

  parseEvent (elem) {
    const Player = this.player.constructor
    return parseZoneGroupTopology(elem, Player)
  }
}

function parseZoneGroupTopology (p, Player) {
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

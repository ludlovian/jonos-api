import Parsley from 'parsley'

import SonosService from './service.mjs'

export default class ZoneGroupTopology extends SonosService {
  name = 'ZoneGroupTopology'
  path = 'ZoneGroupTopology'

  // this is a system wide service
  systemWide = true

  commands = ['getZonGroupState']

  getZonGroupState () {
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

  const groups = []

  for (const zg of p.findAll('ZoneGroup')) {
    const leaderUuid = zg.attr.Coordinator
    let leader
    const members = []

    for (const zgm of zg.findAll('ZoneGroupMember')) {
      if (+zgm.attr.Invisible) continue
      const url = new URL('/', zgm.attr.Location)
      const uuid = zgm.attr.UUID
      const player = new Player(url)
      members.push(player)
      if (uuid === leaderUuid) leader = player
    }

    if (leader) groups.push({ leader, members })
  }
  return { groups }
}

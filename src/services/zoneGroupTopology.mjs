import Parsley from '@ludlovian/parsley'

import SonosService from './service.mjs'

export default class ZoneGroupTopology extends SonosService {
  static name = 'ZoneGroupTopology'
  static path = 'ZoneGroupTopology'

  // this is a system wide service
  static systemWide = true

  static commands = ['getZoneGroupState']

  getZoneGroupState () {
    return this.callSOAP('GetZoneGroupState', {}).then(p =>
      parseZoneGroupTopology(p)
    )
  }

  parseXmlEvent (elem) {
    return parseZoneGroupTopology(elem)
  }
}

function parseZoneGroupTopology (p) {
  p = p.find('ZoneGroupState')
  /* c8 ignore next */
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

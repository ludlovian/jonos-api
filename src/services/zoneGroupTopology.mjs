import SonosService from './service.mjs'
import { parseZoneGroupTopology } from '../parsers.mjs'

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

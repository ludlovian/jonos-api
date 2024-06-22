import SonosService from './service.mjs'
import { parseZoneGroupState } from '../parsers.mjs'

export default class ZoneGroupTopology extends SonosService {
  static name = 'ZoneGroupTopology'
  static path = 'ZoneGroupTopology'

  static commands = ['getZoneGroupState']

  getZoneGroupState () {
    return this.callSOAP('GetZoneGroupState', {}).then(d =>
      parseZoneGroupState(d.zoneGroupState)
    )
  }

  parseEvent ({ zoneGroupState }) {
    if (zoneGroupState) return parseZoneGroupState(zoneGroupState)
  }
}

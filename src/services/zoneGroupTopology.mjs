import SonosService from './service.mjs'
import { parseZoneGroupState } from '../parsers.mjs'

export default class ZoneGroupTopology extends SonosService {
  static name = 'ZoneGroupTopology'
  static path = 'ZoneGroupTopology'

  static commands = ['getZoneGroupState', 'getCurrentGroup']

  getZoneGroupState () {
    return this.callSOAP('GetZoneGroupState', {}).then(d =>
      parseZoneGroupState(d.zoneGroupState)
    )
  }

  async getCurrentGroup () {
    const data = await this.callSOAP('GetZoneGroupAttributes', {})
    return {
      leaderUuid: data.currentZoneGroupId.split(':')[0],
      memberUuids: data.currentZonePlayerUuiDsInGroup.split(',')
    }
  }

  parseEvent ({ zoneGroupState }) {
    if (zoneGroupState) return parseZoneGroupState(zoneGroupState)
  }
}

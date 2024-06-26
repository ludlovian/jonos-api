import guess from '@ludlovian/guess'
import SonosService from './service.mjs'
import { parseQueue } from '../parsers.mjs'

export default class ContentDirectory extends SonosService {
  static name = 'ContentDirectory'
  static path = 'MediaServer/ContentDirectory'

  static commands = ['getQueue']

  getQueue (fromNum = 0, count = 100) {
    const parms = {
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: fromNum,
      RequestedCount: count,
      SortCriteria: '',
      ObjectID: 'Q:0'
    }
    return this.callSOAP('Browse', parms).then(parseQueue)
  }

  parseEvent (data) {
    return {
      libraryUpdating: guess(data.shareIndexInProgress, { bool: true })
    }
  }
}

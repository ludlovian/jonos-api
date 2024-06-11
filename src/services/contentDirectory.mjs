import Parsley from '@ludlovian/parsley'

import SonosService from './service.mjs'

export default class ContentDirectory extends SonosService {
  static name = 'ContentDirectory'
  static path = 'MediaServer/ContentDirectory'

  static commands = ['getQueue']

  // events are only for updating the media library
  systemWide = true

  getQueue (fromNum = 0, count = 100) {
    const parms = {
      BrowseFlag: 'BrowseDirectChildren',
      Filter: '*',
      StartingIndex: fromNum,
      RequestedCount: count,
      SortCriteria: '',
      ObjectID: 'Q:0'
    }
    return this.callSOAP('Browse', parms).then(e => {
      const text = e.find('Result')?.text?.trim()
      if (!text) return undefined

      e = Parsley.from(text)
      const queue = e
        .findAll('item')
        .map(el => el.find('res')?.text)
        .filter(Boolean)

      return { queue }
    })
  }
}

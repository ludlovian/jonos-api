import guess from '@ludlovian/guess'

import SonosService from './service.mjs'

export default class RenderingControl extends SonosService {
  static name = 'RenderingControl'
  static path = 'MediaRenderer/RenderingControl'

  static commands = ['getVolume', 'getMute', 'setVolume', 'setMute']

  getVolume () {
    const parms = { InstanceID: 0, Channel: 'Master' }
    return this.callSOAP('GetVolume', parms).then(p => ({
      volume: guess(p.get('CurrentVolume')?.text)
    }))
  }

  getMute () {
    const parms = { InstanceID: 0, Channel: 'Master' }
    return this.callSOAP('GetMute', parms).then(p => ({
      mute: guess(p.get('CurrentMute')?.text, { bool: true })
    }))
  }

  async setVolume (vol) {
    const parms = { InstanceID: 0, Channel: 'Master', DesiredVolume: vol }
    await this.callSOAP('SetVolume', parms)
  }

  async setMute (mute) {
    mute = mute ? '1' : '0'
    const parms = { InstanceID: 0, Channel: 'Master', DesiredMute: mute }
    await this.callSOAP('SetMute', parms)
  }

  parseXmlEvent (e) {
    return {
      volume: guess(e.find(master('Volume'))?.attr?.val),
      mute: guess(e.find(master('Mute'))?.attr?.val, { bool: true })
    }
  }
}

function master (type) {
  return e => e.type === type && e.attr.channel === 'Master'
}

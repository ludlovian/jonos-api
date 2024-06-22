import guess from '@ludlovian/guess'

import SonosService from './service.mjs'

export default class RenderingControl extends SonosService {
  static name = 'RenderingControl'
  static path = 'MediaRenderer/RenderingControl'

  static commands = ['getVolume', 'getMute', 'setVolume', 'setMute']

  getVolume () {
    const parms = { InstanceID: 0, Channel: 'Master' }
    return this.callSOAP('GetVolume', parms).then(d => ({
      volume: guess(d.currentVolume)
    }))
  }

  getMute () {
    const parms = { InstanceID: 0, Channel: 'Master' }
    return this.callSOAP('GetMute', parms).then(d => ({
      mute: guess(d.currentMute, { bool: true })
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

  parseEvent (data) {
    return {
      volume: guess(data['volume:Master']),
      mute: guess(data['mute:Master'], { bool: true })
    }
  }
}

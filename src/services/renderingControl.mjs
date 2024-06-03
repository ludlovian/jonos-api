import SonosService from './service.mjs'

export default class RenderingControl extends SonosService {
  static name = 'RenderingControl'
  static path = 'MediaRenderer/RenderingControl'

  static commands = ['getVolume', 'getMute', 'setVolume', 'setMute']

  getVolume () {
    const parms = { InstanceID: 0, Channel: 'Master' }
    return this.callSOAP('GetVolume', parms, p => {
      return {
        volume: parseVolume(p.get('CurrentVolume')?.text)
      }
    })
  }

  getMute () {
    const parms = { InstanceID: 0, Channel: 'Master' }
    return this.callSOAP('GetMute', parms, p => {
      return {
        mute: parseMute(p.get('CurrentMute')?.text)
      }
    })
  }

  setVolume (vol) {
    const parms = { InstanceID: 0, Channel: 'Master', DesiredVolume: vol }
    return this.callSOAP('SetVolume', parms)
  }

  setMute (mute) {
    mute = mute ? '1' : '0'
    const parms = { InstanceID: 0, Channel: 'Master', DesiredMute: mute }
    return this.callSOAP('SetMute', parms)
  }

  parseEvent (elem) {
    return {
      volume: parseVolume(elem.find(master('Volume'))?.attr?.val),
      mute: parseMute(elem.find(master('Mute'))?.attr?.val)
    }
  }
}

function parseVolume (x) {
  if (x == null) return x
  x = +x
  if (isNaN(x)) return undefined
  return x
}

function parseMute (x) {
  if (x == null) return x
  return Boolean(+x)
}

function master (type) {
  return e => e.type === type && e.attr.channel === 'Master'
}

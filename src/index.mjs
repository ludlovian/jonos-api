import Debug from '@ludlovian/debug'
import Player from './player.mjs'
import constants from './constants.mjs'
export * from './constants.mjs'

Object.assign(Player, constants)

export default Player
export { Player }

/* c8 ignore start */
if (Debug('jonos-api:player').enabled) {
  global.jonosApi = { Player }
}
/* c8 ignore end */

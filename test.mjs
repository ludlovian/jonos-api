import('./src/player.mjs')
  .then(mod => global.Player = mod.default)

import process from 'node:process'

import { parse as parseMs } from '@lukeed/ms'
import camelCase from 'pixutil/camel-case'
import guess from 'pixutil/guess'

const defaults = {
  apiCallRetryCount: 1,
  apiCallRetryDelay: parseMs('2s'),

  apiCallTimeout: parseMs('5s'),

  apiSubscriptionTimeout: 'Second-1800',
  apiSubscriptionRenew: parseMs('25m'),

  apiDiscoveryTimeout: parseMs('3s')
}

function envVars (prefix) {
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [camelCase(key.slice(prefix.length)), value])
  )
}

function convertObject (o) {
  return Object.fromEntries(
    Object.entries(o).map(([key, value]) => [key, guess(value)])
  )
}

export default {
  ...defaults,
  ...convertObject(envVars('JONOS_'))
}

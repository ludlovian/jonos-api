import process from 'node:process'

import { parse as parseMs } from '@lukeed/ms'
import camelCase from 'pixutil/camelCase'

import convert from './convert.mjs'

function envVars (prefix) {
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [camelCase(key.slice(prefix.length)), value])
  )
}

function convertObject (o) {
  return Object.fromEntries(
    Object.entries(o).map(([key, value]) => [key, convert(value)])
  )
}

const defaults = {
  apiCallRetryCount: 1,
  apiCallRetryDelay: parseMs('2s'),

  apiCallTimeout: parseMs('5s'),

  apiSubscriptionTimeout: 'Second-1800',
  apiSubscriptionRenew: parseMs('25m'),

  apiDiscoveryTimeout: parseMs('3s')
}

export default {
  ...defaults,
  ...convertObject(envVars('JONOS_'))
}

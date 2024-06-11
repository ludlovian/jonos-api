import configure from '@ludlovian/configure'

export default configure('JONOS_', {
  apiCallRetryCount: 1,
  apiCallRetryDelay: '2s',

  apiCallTimeout: '5s',

  apiSubscriptionTimeout: 'Second-1800',
  apiSubscriptionRenew: '25m',

  apiDiscoveryTimeout: '3s'
})

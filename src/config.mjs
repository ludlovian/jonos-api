import configure from '@ludlovian/configure'

export default configure('JONOS_API_', {
  callRetryCount: 2,
  callRetryDelay: '2s',

  callTimeout: '5s',

  subscriptionTimeout: 'Second-1800',
  subscriptionRenew: '25m',

  discoveryTimeout: '3s'
})

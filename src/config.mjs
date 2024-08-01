import configure from '@ludlovian/configure'

export default configure('JONOS_API_', {
  callRetryCount: 1,
  callRetryDelay: '2s',

  subscriptionTimeout: 'Second-1800',
  subscriptionRenew: '25m'
})

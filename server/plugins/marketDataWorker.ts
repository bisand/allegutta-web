import { startGlobalMarketDataWorker } from '../lib/globalMarketDataWorker'

export default defineNitroPlugin(async (nitroApp) => {
  // Only start the worker in production or when explicitly enabled
  const shouldStartWorker = process.env.NODE_ENV === 'production' || 
                           process.env.ENABLE_MARKET_DATA_WORKER === 'true'

  if (shouldStartWorker) {
    console.log('Starting market data background worker...')
    
    // Start the worker with updates every 4 hours (to stay within rate limits)
    // Alpha Vantage free tier: 25 requests/day = one update every ~4 hours for 6 symbols
    startGlobalMarketDataWorker(240) // 240 minutes = 4 hours
    
    console.log('Market data worker started - will update holdings every 4 hours')
  } else {
    console.log('Market data worker disabled - set ENABLE_MARKET_DATA_WORKER=true to enable')
  }

  // Graceful shutdown
  nitroApp.hooks.hook('close', () => {
    console.log('Shutting down market data worker...')
    // The worker will be stopped when the process exits
  })
})

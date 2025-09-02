import { startGlobalMarketDataWorker } from '../lib/globalMarketDataWorker'

export default defineNitroPlugin(async (nitroApp) => {
  // Only start the worker in production or when explicitly enabled
  const shouldStartWorker = process.env.NODE_ENV === 'production' || 
                           process.env.ENABLE_MARKET_DATA_WORKER === 'true'

  if (shouldStartWorker) {
    console.log('Starting Yahoo Finance market data background worker...')
    
    // Start the worker with updates every 2 hours (very conservative with Yahoo Finance)
    // With 15-second delays between requests, updating 2 holdings takes 30 seconds
    startGlobalMarketDataWorker(120) // 120 minutes = 2 hours
    
    console.log('Market data worker started - will update holdings every 2 hours using Yahoo Finance (15s between requests)')
  } else {
    console.log('Market data worker disabled - set ENABLE_MARKET_DATA_WORKER=true to enable')
  }

  // Graceful shutdown
  nitroApp.hooks.hook('close', () => {
    console.log('Shutting down market data worker...')
    // The worker will be stopped when the process exits
  })
})

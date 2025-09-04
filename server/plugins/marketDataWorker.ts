import { MarketDataWorkerV2 } from '../lib/marketDataWorkerV2'
import { PrismaClient } from '@prisma/client'

let globalWorker: MarketDataWorkerV2 | null = null

export default defineNitroPlugin(async (nitroApp) => {
  // Only start the worker in production or when explicitly enabled
  const shouldStartWorker = process.env.NODE_ENV === 'production' || 
                           process.env.ENABLE_MARKET_DATA_WORKER === 'true'

  if (shouldStartWorker) {
    console.log('Starting Yahoo Finance market data background worker...')
    
    try {
      const prisma = new PrismaClient()
      globalWorker = new MarketDataWorkerV2(prisma)

      // Get configurable update interval from environment variable (default: 1 minute)
      const configuredInterval = parseFloat(process.env.MARKET_DATA_UPDATE_INTERVAL_MINUTES || '1')
      
      // Enforce minimum interval of 15 seconds (0.25 minutes) to prevent API abuse
      const MIN_INTERVAL_MINUTES = 0.25 // 15 seconds
      const updateIntervalMinutes = Math.max(configuredInterval, MIN_INTERVAL_MINUTES)
      
      // Log warning if interval was adjusted
      if (configuredInterval < MIN_INTERVAL_MINUTES) {
        console.warn(`Warning: Configured interval ${configuredInterval} minutes is too short. Using minimum interval of ${MIN_INTERVAL_MINUTES} minutes (15 seconds) instead.`)
      }
      
      // Start the worker with validated update interval
      globalWorker.startPeriodicUpdates(updateIntervalMinutes)

      console.log(`Market data worker started - will update market data every ${updateIntervalMinutes} minute(s) using Yahoo Finance`)
    } catch (error) {
      console.error('Failed to start market data worker:', error)
    }
  } else {
    console.log('Market data worker disabled - set ENABLE_MARKET_DATA_WORKER=true to enable')
  }

  // Graceful shutdown
  nitroApp.hooks.hook('close', () => {
    console.log('Shutting down market data worker...')
    if (globalWorker) {
      globalWorker.stopPeriodicUpdates()
      globalWorker = null
    }
  })
})

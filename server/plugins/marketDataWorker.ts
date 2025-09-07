import { MarketDataWorkerV2 } from '../lib/marketDataWorkerV2'
import { PrismaClient } from '@prisma/client'

let globalWorker: MarketDataWorkerV2 | null = null

export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig()

  // Use runtime config to determine if the worker should be started
  const enableWorker = config.enableMarketDataWorker
  const updateInterval = config.marketDataWorkerInterval || 15 // Default to 15 minutes if not set
  // Only start the worker in production or when explicitly enabled

  if (enableWorker) {
    console.log('Starting Yahoo Finance market data background worker...')

    try {
      const prisma = new PrismaClient()
      globalWorker = new MarketDataWorkerV2(prisma)

      // Enforce minimum interval of 15 seconds (0.25 minutes) to prevent API abuse
      const MIN_INTERVAL_MINUTES = 0.25 // 15 seconds
      const updateIntervalMinutes = Math.max(updateInterval, MIN_INTERVAL_MINUTES)

      // Log warning if interval was adjusted
      if (updateInterval < MIN_INTERVAL_MINUTES) {
        console.warn(`Warning: Configured interval ${updateInterval} minutes is too short. Using minimum interval of ${MIN_INTERVAL_MINUTES} minutes (15 seconds) instead.`)
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

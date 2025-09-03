import { MarketDataWorker } from '../lib/marketDataWorkerSimplified'
import { PrismaClient } from '@prisma/client'

let globalWorker: MarketDataWorker | null = null

export default defineNitroPlugin(async (nitroApp) => {
  // Only start the worker in production or when explicitly enabled
  const shouldStartWorker = process.env.NODE_ENV === 'production' || 
                           process.env.ENABLE_MARKET_DATA_WORKER === 'true'

  if (shouldStartWorker) {
    console.log('Starting Yahoo Finance market data background worker...')
    
    try {
      const prisma = new PrismaClient()
      globalWorker = new MarketDataWorker(prisma)
      
      // Start the worker with updates every 2 hours
      globalWorker.startPeriodicUpdates(120) // 120 minutes = 2 hours
      
      console.log('Market data worker started - will update holdings every 2 hours using Yahoo Finance')
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

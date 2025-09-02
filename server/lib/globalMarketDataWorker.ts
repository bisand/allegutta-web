import { MarketDataWorker } from './marketDataWorker'
import prisma from './prisma'

let globalMarketDataWorker: MarketDataWorker | null = null

export function getMarketDataWorker(): MarketDataWorker {
  if (!globalMarketDataWorker) {
    const config = useRuntimeConfig()
    if (!config.alphaVantageApiKey) {
      throw new Error('Alpha Vantage API key not configured')
    }
    
    globalMarketDataWorker = new MarketDataWorker(prisma, config.alphaVantageApiKey as string)
  }
  
  return globalMarketDataWorker
}

export function startGlobalMarketDataWorker(intervalMinutes: number = 60): void {
  try {
    const worker = getMarketDataWorker()
    worker.startPeriodicUpdates(intervalMinutes)
    console.log('Global market data worker started successfully')
  } catch (error) {
    console.error('Failed to start global market data worker:', error)
  }
}

export function stopGlobalMarketDataWorker(): void {
  if (globalMarketDataWorker) {
    globalMarketDataWorker.stopPeriodicUpdates()
    console.log('Global market data worker stopped')
  }
}

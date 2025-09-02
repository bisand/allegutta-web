import { MarketDataWorker } from './marketDataWorker'
import prisma from './prisma'

let globalMarketDataWorker: MarketDataWorker | null = null

export function getMarketDataWorker(): MarketDataWorker {
  if (!globalMarketDataWorker) {
    globalMarketDataWorker = new MarketDataWorker(prisma)
  }
  
  return globalMarketDataWorker
}

export function startGlobalMarketDataWorker(intervalMinutes: number = 120): void {
  try {
    const worker = getMarketDataWorker()
    worker.startPeriodicUpdates(intervalMinutes)
    console.log('Global market data worker started successfully with Yahoo Finance (respectful 15s delays)')
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

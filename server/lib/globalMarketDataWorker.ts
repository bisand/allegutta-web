import { MarketDataWorkerV2 } from './marketDataWorkerV2'
import prisma from './prisma'

let globalMarketDataWorker: MarketDataWorkerV2 | null = null

export function getMarketDataWorker(): MarketDataWorkerV2 {
  if (!globalMarketDataWorker) {
    globalMarketDataWorker = new MarketDataWorkerV2(prisma)
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

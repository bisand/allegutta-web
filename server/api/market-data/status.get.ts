import { getMarketDataWorker } from '../../lib/globalMarketDataWorker'

export default defineEventHandler(async (_event) => {
  try {
    const worker = getMarketDataWorker()
    
    return {
      isRunning: worker.isWorkerRunning(),
      status: worker.isWorkerRunning() ? 'active' : 'stopped',
      message: worker.isWorkerRunning() 
        ? 'Market data worker is running and updating holdings periodically'
        : 'Market data worker is stopped'
    }
  } catch (error) {
    console.error('Error checking worker status:', error)
    return {
      isRunning: false,
      status: 'error',
      message: 'Failed to check worker status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
})

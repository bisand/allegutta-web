import { MarketDataWorkerV2 } from '~~/server/lib/marketDataWorkerV2'
import { PrismaClient } from '@prisma/client'

export default defineEventHandler(async (_event) => {
  try {
    const prisma = new PrismaClient()
    const worker = new MarketDataWorkerV2(prisma)

    console.log('Testing new MarketData structure...')
    await worker.updateAllMarketData()
    await prisma.$disconnect()
    
    return {
      success: true,
      message: 'Market data update completed with new structure'
    }
  } catch (error) {
    console.error('Error in market data update:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

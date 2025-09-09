import { defineEventHandler, readBody } from 'h3'
import { MarketDataWorkerV2 } from '~~/server/lib/marketDataWorkerV2'
import { PrismaClient } from '@prisma/client'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const portfolioId = body?.portfolioId

    const prisma = new PrismaClient()
    const worker = new MarketDataWorkerV2(prisma)

    if (portfolioId) {
      console.log(`Manually triggering market data update for portfolio: ${portfolioId}`)
      await worker.updateAllMarketData()
      await prisma.$disconnect()

      return {
        success: true,
        message: `Market data update completed for portfolio ${portfolioId}`
      }
    } else {
      console.log('Manually triggering market data update for all holdings')
      await worker.updateAllMarketData()
      await prisma.$disconnect()

      return {
        success: true,
        message: 'Market data update completed for all holdings'
      }
    }
  } catch (error) {
    console.error('Error in manual market data update:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
})

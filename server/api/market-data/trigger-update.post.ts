import { defineEventHandler, readBody } from 'h3'
import { MarketDataWorker } from '~~/server/lib/marketDataWorkerSimplified'
import { PrismaClient } from '@prisma/client'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const portfolioId = body?.portfolioId

    const prisma = new PrismaClient()
    const worker = new MarketDataWorker(prisma)

    if (portfolioId) {
      console.log(`Manually triggering market data update for portfolio: ${portfolioId}`)
      await worker.updateSpecificHoldings(portfolioId)
      await prisma.$disconnect()
      
      return {
        success: true,
        message: `Market data update completed for portfolio ${portfolioId}`
      }
    } else {
      console.log('Manually triggering market data update for all holdings')
      await worker.updateAllHoldings()
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

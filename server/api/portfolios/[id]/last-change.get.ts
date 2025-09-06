// API endpoint to check if portfolio data has changed
import { defineEventHandler, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'

export default defineEventHandler(async (event) => {
  try {
    const portfolioId = getRouterParam(event, 'id')
    if (!portfolioId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Portfolio ID is required'
      })
    }

    const prisma = new PrismaClient()
    
    try {
      // Get the portfolio to ensure it exists
      const portfolio = await prisma.portfolios.findUnique({
        where: { id: portfolioId },
        select: { updatedAt: true }
      })

      if (!portfolio) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Portfolio not found'
        })
      }

      // Get the most recent market data update time for holdings in this portfolio
      const latestMarketData = await prisma.$queryRaw<Array<{regularMarketTime: string | null}>>`
        SELECT MAX(md.regularMarketTime) as regularMarketTime
        FROM market_data md
        INNER JOIN holdings h ON h.isin = md.isin
        WHERE h.portfolioId = ${portfolioId}
        AND md.regularMarketTime IS NOT NULL
      `

      // Use the most recent between portfolio update and market data update
      let lastChange = portfolio.updatedAt.toISOString()
      
      if (latestMarketData[0]?.regularMarketTime) {
        const marketDataTime = new Date(latestMarketData[0].regularMarketTime)
        const portfolioTime = new Date(portfolio.updatedAt)
        
        if (marketDataTime > portfolioTime) {
          lastChange = marketDataTime.toISOString()
        }
      }
      
      return {
        lastChange,
        timestamp: Date.now()
      }
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('Error checking portfolio changes:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check portfolio changes'
    })
  }
})

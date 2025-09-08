import prisma from '../../../lib/prisma'
import { getRequiredAuth } from '../../../lib/auth'

// GET /api/portfolios/[id]/holdings - Get portfolio holdings
export default defineEventHandler(async (event) => {

  const portfolioId = getRouterParam(event, 'id')

  const { dbUser } = await getRequiredAuth(event)

  try {
    // Verify portfolio belongs to user
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        id: portfolioId,
        userId: dbUser.id // Use database user ID
      }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    const holdings = await prisma.holdings.findMany({
      where: {
        portfolioId: portfolioId
      },
      orderBy: {
        symbol: 'asc'
      }
    })

    // Manually join with market data since Prisma doesn't support direct relations
    const holdingsWithMarketData = await Promise.all(
      holdings.map(async (holding: { id: string; portfolioId: string; symbol: string; isin: string | null; quantity: number; avgPrice: number; currency: string; createdAt: Date; updatedAt: Date }) => {
        let marketData = null
        
        // Try to find market data by ISIN first, then by symbol
        if (holding.isin) {
          marketData = await prisma.market_data.findUnique({
            where: { isin: holding.isin }
          })
        }
        
        // If no market data found by ISIN, try by symbol
        if (!marketData) {
          marketData = await prisma.market_data.findFirst({
            where: { symbol: holding.symbol }
          })
        }

        return {
          ...holding,
          currentPrice: marketData?.currentPrice || null,
          regularMarketChange: marketData?.regularMarketChange || null,
          regularMarketChangePercent: marketData?.regularMarketChangePercent || null,
          regularMarketPreviousClose: marketData?.regularMarketPreviousClose || null,
          regularMarketTime: marketData?.regularMarketTime || null,
          lastUpdated: marketData?.lastUpdated || null,
          // Include instrument name and Yahoo symbol
          instrumentName: marketData?.longName || marketData?.shortName || null,
          symbolYahoo: marketData?.symbolYahoo || null
        }
      })
    )

    return {
      success: true,
      data: {
        portfolio: {
          id: portfolio.id,
          name: portfolio.name,
          cashBalance: portfolio.cashBalance || 0
        },
        holdings: holdingsWithMarketData
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch holdings'
    })
  }
})

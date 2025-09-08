import prisma from '../../../../lib/prisma'

// GET /api/public/portfolios/[id]/holdings - Get public portfolio holdings
export default defineEventHandler(async (event) => {

  const portfolioId = getRouterParam(event, 'id')

  try {
    // Verify portfolio exists (no auth required for public portfolios)
    const portfolio = await prisma.portfolios.findUnique({
      where: { id: portfolioId }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    const holdings = await prisma.holdings.findMany({
      where: { portfolioId },
      orderBy: { symbol: 'asc' }
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
          regularMarketVolume: marketData?.regularMarketVolume || null,
          lastUpdated: marketData?.lastUpdated || null
        }
      })
    )

    return {
      success: true,
      data: holdingsWithMarketData
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

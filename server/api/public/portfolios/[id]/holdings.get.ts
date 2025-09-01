import prisma from '../../../../lib/prisma'

// GET /api/public/portfolios/[id]/holdings - Get public portfolio holdings
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const portfolioId = getRouterParam(event, 'id')

  try {
    // Verify portfolio exists (no auth required for public portfolios)
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    const holdings = await prisma.holding.findMany({
      where: { portfolioId },
      orderBy: { symbol: 'asc' }
    })

    return {
      success: true,
      data: holdings
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

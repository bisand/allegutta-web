import prisma from '../../../lib/prisma'

// GET /api/public/portfolios/[id] - Get public portfolio info
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

    return {
      data: portfolio
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

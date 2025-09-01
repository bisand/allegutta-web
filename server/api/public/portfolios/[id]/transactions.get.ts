import prisma from '../../../../lib/prisma'

// GET /api/public/portfolios/[id]/transactions - Get public portfolio transactions
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

    const transactions = await prisma.transaction.findMany({
      where: { portfolioId },
      orderBy: { date: 'desc' }
    })

    return {
      success: true,
      data: transactions
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

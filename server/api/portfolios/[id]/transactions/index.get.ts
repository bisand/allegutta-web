import prisma from '../../../../lib/prisma'

// GET /api/portfolios/[id]/transactions - Get portfolio transactions
export default defineEventHandler(async (event) => {

  const portfolioId = getRouterParam(event, 'id')

  try {
    // Verify portfolio exists
    const portfolio = await prisma.portfolios.findUnique({
      where: { id: portfolioId }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    const transactions = await prisma.transactions.findMany({
      where: {
        portfolioId: portfolioId
      },
      orderBy: {
        date: 'desc'
      }
    })

    return {
      success: true,
      data: transactions
    }
  } catch (error) {
    // Preserve the original error (e.g., 401 for authentication)
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch transactions'
    })
  }
})

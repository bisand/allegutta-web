import prisma from '../../../lib/prisma'

// GET /api/portfolios/[id]/transactions - Get portfolio transactions
export default defineEventHandler(async (event) => {

  const portfolioId = getRouterParam(event, 'id')
  const user = await event.context.kinde.getUser()
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }


  try {
    // Verify portfolio belongs to user
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        id: portfolioId,
      }
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
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch transactions'
    })
  }
})

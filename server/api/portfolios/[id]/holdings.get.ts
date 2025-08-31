import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

// GET /api/portfolios/[id]/holdings - Get portfolio holdings
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await requireAuth(event)
  const portfolioId = getRouterParam(event, 'id')

  try {
    // Verify portfolio belongs to user
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: user.id
      }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    const holdings = await prisma.holding.findMany({
      where: {
        portfolioId: portfolioId
      },
      orderBy: {
        symbol: 'asc'
      }
    })

    return {
      success: true,
      data: holdings
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch holdings'
    })
  }
})

import prisma from '../../../../lib/prisma'
import { getRequiredAuth } from '../../../../lib/auth'

// GET /api/portfolios/[id]/transactions - Get portfolio transactions
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

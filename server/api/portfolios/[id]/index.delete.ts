import prisma from '../../../lib/prisma'
import { getRequiredAuth } from '../../../lib/auth'

// DELETE /api/portfolios/[id] - Delete portfolio
export default defineEventHandler(async (event) => {
  const { dbUser } = await getRequiredAuth(event)

  const portfolioId = getRouterParam(event, 'id')

  if (!portfolioId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio ID is required'
    })
  }

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

    // Prevent deletion of default portfolio
    if (portfolio.isDefault) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete default portfolio'
      })
    }

    // Delete the portfolio (this will cascade delete transactions and holdings)
    await prisma.portfolios.delete({
      where: {
        id: portfolioId
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting portfolio:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete portfolio'
    })
  }
})

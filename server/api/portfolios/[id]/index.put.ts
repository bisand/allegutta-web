import prisma from '../../../lib/prisma'
import { getRequiredAuth } from '../../../lib/auth'

// PUT /api/portfolios/[id] - Update portfolio
export default defineEventHandler(async (event) => {
  const { dbUser } = await getRequiredAuth(event)

  const portfolioId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!portfolioId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio ID is required'
    })
  }

  // Validate input
  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio name is required'
    })
  }

  try {
    // Verify portfolio belongs to user
    const existingPortfolio = await prisma.portfolios.findFirst({
      where: {
        id: portfolioId,
        userId: dbUser.id // Use database user ID
      }
    })

    if (!existingPortfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    // If setting as default, unset other default portfolios for this user
    if (body.isDefault) {
      await prisma.portfolios.updateMany({
        where: {
          userId: dbUser.id, // Use database user ID
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Update the portfolio
    const updatedPortfolio = await prisma.portfolios.update({
      where: {
        id: portfolioId
      },
      data: {
        name: body.name,
        description: body.description || null,
        isDefault: body.isDefault || false
      }
    })

    return {
      success: true,
      data: updatedPortfolio
    }
  } catch (error) {
    console.error('Error updating portfolio:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update portfolio'
    })
  }
})

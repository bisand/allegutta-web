import prisma from '../../lib/prisma'
import { requireAuth } from '../../lib/auth'

// PUT /api/portfolios/[id] - Update portfolio
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PUT') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await requireAuth(event)
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
    const existingPortfolio = await prisma.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: user.id
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
      await prisma.portfolio.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Update the portfolio
    const updatedPortfolio = await prisma.portfolio.update({
      where: {
        id: portfolioId
      },
      data: {
        name: body.name,
        description: body.description || null,
        isDefault: body.isDefault || false,
        updatedAt: new Date()
      }
    })

    return updatedPortfolio
  } catch (error) {
    console.error('Error updating portfolio:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update portfolio'
    })
  }
})

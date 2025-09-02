import prisma from '../lib/prisma'
import { requireAuth } from '../lib/auth'

// POST /api/portfolios - Create new portfolio
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await requireAuth(event)
  const body = await readBody(event)

  // Validate input
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio name is required'
    })
  }

  try {
    const portfolio = await prisma.portfolio.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        currency: body.currency || 'NOK',
        userId: user.id,
        isDefault: body.isDefault || false
      }
    })

    return {
      success: true,
      data: portfolio
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create portfolio'
    })
  }
})

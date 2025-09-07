import prisma from '../../lib/prisma'

// POST /api/portfolios - Create new portfolio
export default defineEventHandler(async (event) => {

  const body = await readBody(event)

  const user = await event.context.kinde.getUser()
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Validate input
  if (!body.name || body.name.trim().length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio name is required'
    })
  }

  try {
    const portfolio = await prisma.portfolios.create({
      data: {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        description: body.description?.trim() || null,
        currency: body.currency || 'NOK',
        userId: user.id,
        isDefault: body.isDefault || false,
        updatedAt: new Date()
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

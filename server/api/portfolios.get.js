import prisma from '../lib/prisma.js'
import { requireAuth } from '../lib/auth.js'

// GET /api/portfolios - Get user's portfolios
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await requireAuth(event)

  try {
    const portfolios = await prisma.portfolio.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        isDefault: 'desc'
      }
    })

    return {
      success: true,
      data: portfolios
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch portfolios'
    })
  }
})

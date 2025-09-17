import prisma from '../../lib/prisma'
import { getRequiredAuth } from '../../lib/auth'

// GET /api/portfolios - Get portfolios for authenticated user
export default defineEventHandler(async (event) => {

  const { dbUser } = await getRequiredAuth(event)

  try {
    // Return only portfolios that belong to the authenticated user
    const portfolios = await prisma.portfolios?.findMany({
      where: {
        userId: dbUser.id // Filter by authenticated user
      },
      select: {
        id: true,
        name: true,
        description: true,
        isDefault: true,
        currency: true,
        cashBalance: true,
        athValue: true,
        athDate: true,
        createdAt: true,
        updatedAt: true,
        // Don't include userId for privacy
      },
      orderBy: {
        isDefault: 'desc'
      }
    })

    return {
      success: true,
      data: portfolios,
      isAuthenticated: true
    }
  } catch (error) {
    console.error('Failed to fetch portfolios:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch portfolios'
    })
  }
})

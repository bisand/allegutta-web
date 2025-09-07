import prisma from '../../lib/prisma'

// GET /api/portfolios - Get all portfolios (public for all users)
export default defineEventHandler(async (event) => {

  const user = await event.context.kinde.getUser()
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  try {
    // Return all portfolios for everyone (read-only for unauthenticated users)
    const portfolios = await prisma.portfolios?.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isDefault: true,
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
      isAuthenticated: !!user
    }
  } catch (error) {
    console.error('Failed to fetch portfolios:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch portfolios'
    })
  }
})

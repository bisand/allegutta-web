import prisma from '../../lib/prisma'

// GET /api/public/portfolios - Get all public portfolios (no auth required)
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  try {
    const portfolios = await prisma.portfolio.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        // Don't include userId for public view
      },
      orderBy: {
        isDefault: 'desc'
      }
    })

    return {
      success: true,
      data: portfolios
    }
  } catch (error) {
    console.error('Failed to fetch public portfolios:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch portfolios'
    })
  }
})

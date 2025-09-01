import prisma from '../lib/prisma'
import { getOptionalAuth } from '../lib/auth'

// GET /api/portfolios - Get user's portfolios (authenticated) or public portfolios (unauthenticated)
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await getOptionalAuth(event)

  try {
    if (user) {
      // Authenticated user - return their portfolios
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
    } else {
      // Unauthenticated user - return only default portfolios (sample data)
      const portfolios = await prisma.portfolio.findMany({
        where: {
          isDefault: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
          // Don't include user information for privacy
        },
        orderBy: {
          isDefault: 'desc'
        }
      })

      return {
        success: true,
        data: portfolios
      }
    }
  } catch (error) {
    console.error('Failed to fetch portfolios:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch portfolios'
    })
  }
})

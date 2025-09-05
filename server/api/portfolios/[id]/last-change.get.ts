// API endpoint to check if portfolio data has changed
import { defineEventHandler, getRouterParam } from 'h3'
import { PrismaClient } from '@prisma/client'

export default defineEventHandler(async (event) => {
  try {
    const portfolioId = getRouterParam(event, 'id')
    if (!portfolioId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Portfolio ID is required'
      })
    }

    const prisma = new PrismaClient()
    
    try {
      // Simple approach: just get the portfolio's updatedAt for now
      // This will be sufficient to detect when the portfolio data changes
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
        select: { updatedAt: true }
      })

      if (!portfolio) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Portfolio not found'
        })
      }
      
      return {
        lastChange: portfolio.updatedAt.toISOString(),
        timestamp: Date.now()
      }
    } finally {
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('Error checking portfolio changes:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check portfolio changes'
    })
  }
})

import prisma from '../../../../lib/prisma'
import { getRequiredAuth } from '../../../../lib/auth'
import { z } from 'zod'

// PUT /api/portfolios/[id]/market-data/[isin] - Update market data for a security
export default defineEventHandler(async (event) => {
  const portfolioId = getRouterParam(event, 'id')
  const isin = getRouterParam(event, 'isin')

  if (!isin || !portfolioId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio ID and ISIN are required'
    })
  }

  const { dbUser } = await getRequiredAuth(event)

  // Validation schema
  const updateMarketDataSchema = z.object({
    symbol: z.string().min(1).max(10).trim(),
    symbolYahoo: z.string().min(1).max(20).trim().optional().nullable(),
    longName: z.string().optional().nullable(),
    shortName: z.string().optional().nullable(),
    exchange: z.string().optional().nullable()
  })

  try {
    const body = await readBody(event)
    const validatedData = updateMarketDataSchema.parse(body)

    // Verify portfolio belongs to user
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        id: portfolioId,
        userId: dbUser.id
      }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    // Check if market data exists for this ISIN
    const existingMarketData = await prisma.market_data.findUnique({
      where: {
        isin: isin
      }
    })

    if (!existingMarketData) {
      // Create new market data entry
      const newMarketData = await prisma.market_data.create({
        data: {
          isin: isin,
          symbol: validatedData.symbol,
          symbolYahoo: validatedData.symbolYahoo,
          longName: validatedData.longName,
          shortName: validatedData.shortName,
          exchange: validatedData.exchange,
          updatedAt: new Date()
        }
      })

      return {
        success: true,
        marketData: newMarketData,
        created: true
      }
    } else {
      // Update existing market data
      const updatedMarketData = await prisma.market_data.update({
        where: {
          isin: isin
        },
        data: {
          symbol: validatedData.symbol,
          symbolYahoo: validatedData.symbolYahoo,
          longName: validatedData.longName,
          shortName: validatedData.shortName,
          exchange: validatedData.exchange,
          updatedAt: new Date()
        }
      })

      return {
        success: true,
        marketData: updatedMarketData,
        created: false
      }
    }

  } catch (error) {
    console.error('Error updating market data:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Market data with this ISIN already exists'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update market data'
    })
  }
})

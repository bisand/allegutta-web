import prisma from '../../../../lib/prisma'
import { getRequiredAuth } from '../../../../lib/auth'
import { z } from 'zod'

// PUT /api/portfolios/[id]/holdings/[holdingId] - Update a portfolio holding
export default defineEventHandler(async (event) => {
  const portfolioId = getRouterParam(event, 'id')
  const holdingId = getRouterParam(event, 'holdingId')

  const { dbUser } = await getRequiredAuth(event)

  // Validation schema
  const updateHoldingSchema = z.object({
    symbol: z.string().min(1).max(10).trim(),
    isin: z.string().length(12).optional().nullable().transform(val => val?.toUpperCase() || null),
    instrumentName: z.string().optional().nullable(),
    currency: z.string().length(3).default('NOK')
  })

  try {
    const body = await readBody(event)
    const validatedData = updateHoldingSchema.parse(body)

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

    // Verify holding exists and belongs to the portfolio
    const existingHolding = await prisma.holdings.findFirst({
      where: {
        id: holdingId,
        portfolioId: portfolioId
      }
    })

    if (!existingHolding) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Holding not found'
      })
    }

    // Check if there's already a holding with the new symbol (if symbol is changing)
    if (validatedData.symbol !== existingHolding.symbol) {
      const conflictingHolding = await prisma.holdings.findFirst({
        where: {
          portfolioId: portfolioId,
          symbol: validatedData.symbol,
          id: { not: holdingId }
        }
      })

      if (conflictingHolding) {
        throw createError({
          statusCode: 409,
          statusMessage: 'A holding with this symbol already exists in the portfolio'
        })
      }
    }

    // Update the holding
    const updatedHolding = await prisma.holdings.update({
      where: {
        id: holdingId
      },
      data: {
        symbol: validatedData.symbol,
        isin: validatedData.isin,
        currency: validatedData.currency,
        updatedAt: new Date()
      }
    })

    // If symbol changed, we need to update all related transactions
    if (validatedData.symbol !== existingHolding.symbol) {
      await prisma.transactions.updateMany({
        where: {
          portfolioId: portfolioId,
          symbol: existingHolding.symbol
        },
        data: {
          symbol: validatedData.symbol,
          isin: validatedData.isin,
          updatedAt: new Date()
        }
      })
    }

    // Update market data if ISIN changed and we have market data
    if (validatedData.isin && validatedData.isin !== existingHolding.isin) {
      await prisma.market_data.updateMany({
        where: {
          symbol: validatedData.symbol
        },
        data: {
          isin: validatedData.isin
        }
      })
    }

    return {
      success: true,
      holding: updatedHolding
    }

  } catch (error) {
    console.error('Error updating holding:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'A holding with this symbol already exists'
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update holding'
    })
  }
})

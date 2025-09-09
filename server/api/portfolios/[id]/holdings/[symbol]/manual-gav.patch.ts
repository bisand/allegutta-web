import prisma from '../../../../../lib/prisma'
import { getRequiredAuth } from '../../../../../lib/auth'
import { z } from 'zod'

const ManualGAVSchema = z.object({
  manualAvgPrice: z.number().positive().optional(),
  useManualAvgPrice: z.boolean(),
  reason: z.string().min(10).max(500).optional()
})

// PATCH/PUT /api/portfolios/[id]/holdings/[symbol]/manual-gav - Set or clear manual GAV
export default defineEventHandler(async (event) => {
  const { dbUser } = await getRequiredAuth(event)

  const portfolioId = getRouterParam(event, 'id')
  const symbol = getRouterParam(event, 'symbol')

  if (!portfolioId || !symbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio ID and symbol are required'
    })
  }

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

  // Verify holding exists
  const holding = await prisma.holdings.findUnique({
    where: {
      portfolioId_symbol: {
        portfolioId,
        symbol
      }
    }
  })

  if (!holding) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Holding not found'
    })
  }

  const body = await readBody(event)
  const validation = ManualGAVSchema.safeParse(body)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request data',
      data: validation.error.issues
    })
  }

  const { manualAvgPrice, useManualAvgPrice, reason } = validation.data

  try {
    // If enabling manual GAV, require both price and reason
    if (useManualAvgPrice) {
      if (!manualAvgPrice || manualAvgPrice <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Manual average price must be provided and greater than 0 when enabling manual GAV'
        })
      }
      
      if (!reason || reason.trim().length < 10) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Reason must be provided and at least 10 characters when enabling manual GAV'
        })
      }
    }

    const updateData: {
      useManualAvgPrice: boolean
      updatedAt: Date
      manualAvgPrice?: number | null
      manualAvgPriceReason?: string | null
      manualAvgPriceDate?: Date | null
      avgPrice?: number
    } = {
      useManualAvgPrice,
      updatedAt: new Date()
    }

    if (useManualAvgPrice) {
      updateData.manualAvgPrice = manualAvgPrice
      updateData.manualAvgPriceReason = reason
      updateData.manualAvgPriceDate = new Date()
      // When using manual GAV, update the actual avgPrice field
      updateData.avgPrice = manualAvgPrice
    } else {
      // When disabling manual GAV, clear the manual fields
      updateData.manualAvgPrice = null
      updateData.manualAvgPriceReason = null
      updateData.manualAvgPriceDate = null
      // Don't update avgPrice here - let recalculation handle it
    }

    const updatedHolding = await prisma.holdings.update({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol
        }
      },
      data: updateData
    })

    // If disabling manual GAV, trigger recalculation to restore calculated GAV
    if (!useManualAvgPrice) {
      const { updateSecurityHoldings } = await import('../../../../../lib/portfolioCalculations')
      await updateSecurityHoldings(portfolioId, symbol)
    }

    return {
      success: true,
      holding: updatedHolding,
      message: useManualAvgPrice 
        ? `Manual GAV set to ${manualAvgPrice} for ${symbol}`
        : `Manual GAV disabled for ${symbol}, recalculated from transactions`
    }
  } catch (error) {
    console.error('Error updating manual GAV:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update manual GAV'
    })
  }
})

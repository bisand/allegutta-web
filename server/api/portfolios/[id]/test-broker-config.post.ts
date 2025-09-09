import { updateSecurityHoldings } from '../../../lib/portfolioCalculations'
import { getRequiredAuth } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const auth = await getRequiredAuth(event)
    const portfolioId = getRouterParam(event, 'id')!
    const body = await readBody(event)

    const { symbol, brokerType, feeAllocationStrategy } = body

    if (!symbol || !brokerType || !feeAllocationStrategy) {
      throw createError({
        statusCode: 400,
        statusMessage: 'symbol, brokerType, and feeAllocationStrategy are required'
      })
    }

    // Update portfolio broker configuration temporarily for testing
    await prisma.portfolios.update({
      where: { 
        id: portfolioId,
        userId: auth.dbUser.id // Ensure user owns portfolio
      },
      data: {
        brokerType: brokerType as string,
        feeAllocationStrategy: feeAllocationStrategy as string
      }
    })

    // Recalculate holdings with new broker configuration
    await updateSecurityHoldings(portfolioId, symbol)

    // Get the updated holding
    const holding = await prisma.holdings.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol
        }
      }
    })

    return {
      success: true,
      configuration: {
        brokerType,
        feeAllocationStrategy
      },
      result: {
        symbol,
        quantity: holding?.quantity || 0,
        avgPrice: holding?.avgPrice || 0,
        totalValue: (holding?.quantity || 0) * (holding?.avgPrice || 0)
      }
    }

  } catch (error) {
    console.error('Error testing broker configuration:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to test broker configuration'
    })
  }
})

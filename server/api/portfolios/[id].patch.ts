import { getRequiredAuth } from '../../lib/auth'
import prisma from '../../lib/prisma'
import { recalculateAllHoldings } from '../../lib/portfolioCalculations'

export default defineEventHandler(async (event) => {
  try {
    const auth = await getRequiredAuth(event)
    const portfolioId = getRouterParam(event, 'id')!
    const body = await readBody(event)

    const { brokerType, feeAllocationStrategy } = body

    if (!brokerType || !feeAllocationStrategy) {
      throw createError({
        statusCode: 400,
        statusMessage: 'brokerType and feeAllocationStrategy are required'
      })
    }

    // Validate broker type
    const validBrokerTypes = ['nordnet', 'degiro', 'dnb', 'generic']
    if (!validBrokerTypes.includes(brokerType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid broker type'
      })
    }

    // Validate fee allocation strategy
    const validStrategies = ['all_to_buys', 'exclude_all', 'proportional', 'buys_only', 'half_fees']
    if (!validStrategies.includes(feeAllocationStrategy)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid fee allocation strategy'
      })
    }

    // Update portfolio broker configuration using raw query to work around type issues
    await prisma.$executeRaw`
      UPDATE portfolios 
      SET brokerType = ${brokerType}, 
          feeAllocationStrategy = ${feeAllocationStrategy},
          updatedAt = datetime('now')
      WHERE id = ${portfolioId} AND userId = ${auth.dbUser.id}
    `
    
    // Verify the update was successful
    const updatedPortfolio = await prisma.portfolios.findUnique({
      where: { id: portfolioId }
    })

    if (!updatedPortfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found or access denied'
      })
    }
    
    // Trigger recalculation of all holdings with new broker configuration
    console.log(`🔄 Recalculating all holdings for portfolio ${portfolioId} with new broker config: ${brokerType}/${feeAllocationStrategy}`)
    await recalculateAllHoldings(portfolioId)

    return {
      success: true,
      portfolio: {
        id: updatedPortfolio.id,
        brokerType: brokerType,
        feeAllocationStrategy: feeAllocationStrategy
      },
      message: 'Broker configuration updated and holdings recalculated'
    }

  } catch (error: unknown) {
    console.error('Error updating broker configuration:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found or access denied'
      })
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update broker configuration'
    })
  }
})

import { getRequiredAuth } from '../../../lib/auth'
import { updateSecurityHoldings } from '../../../lib/portfolioCalculations'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const auth = await getRequiredAuth(event)
    const portfolioId = getRouterParam(event, 'id')!
    const body = await readBody(event)
    
    const { symbols } = body
    
    if (!symbols || !Array.isArray(symbols)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'symbols array is required'
      })
    }
    
    // Verify portfolio ownership
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        id: portfolioId,
        userId: auth.dbUser.id
      }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    console.log(`🔄 Recalculating instruments with relationship system: ${symbols.join(', ')}`)
    
    const results = []
    
    // Recalculate each symbol (the new system will handle relationships automatically)
    for (const symbol of symbols) {
      console.log(`\n📊 Processing ${symbol}...`)
      
      // Get holding before recalculation
      const beforeHolding = await prisma.holdings.findUnique({
        where: {
          portfolioId_symbol: { portfolioId, symbol }
        }
      })
      
      // Recalculate with new relationship system
      await updateSecurityHoldings(portfolioId, symbol)
      
      // Get holding after recalculation
      const afterHolding = await prisma.holdings.findUnique({
        where: {
          portfolioId_symbol: { portfolioId, symbol }
        }
      })
      
      results.push({
        symbol,
        before: beforeHolding ? {
          quantity: beforeHolding.quantity,
          avgPrice: beforeHolding.avgPrice,
          totalValue: beforeHolding.quantity * beforeHolding.avgPrice
        } : null,
        after: afterHolding ? {
          quantity: afterHolding.quantity,
          avgPrice: afterHolding.avgPrice,
          totalValue: afterHolding.quantity * afterHolding.avgPrice
        } : null,
        changed: beforeHolding && afterHolding ? 
          Math.abs(beforeHolding.avgPrice - afterHolding.avgPrice) > 0.01 : 
          false
      })
    }
    
    return {
      success: true,
      message: `Recalculated ${symbols.length} instruments with relationship system`,
      results
    }

  } catch (error) {
    console.error('Error recalculating with relationships:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to recalculate with relationship system'
    })
  }
})

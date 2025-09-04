import prisma from '../../../lib/prisma'
import { updateCashBalance, updateSecurityHoldings } from '../../../lib/portfolioCalculations'
import type { Holding } from '@prisma/client'

export default defineEventHandler(async (event) => {
  try {
    // Get portfolio ID from URL
    const portfolioId = getRouterParam(event, 'id')
    
    if (!portfolioId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Portfolio ID is required'
      })
    }

    console.log(`🔧 Forcing recalculation of holdings and cash for portfolio: ${portfolioId}`)

    // First, update the cash balance for the portfolio
    await updateCashBalance(portfolioId)

    // Get all unique symbols in the portfolio (excluding cash symbols)
    const uniqueSymbols = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolioId,
        NOT: {
          symbol: {
            startsWith: 'CASH_'
          }
        }
      },
      select: {
        symbol: true
      },
      distinct: ['symbol']
    })

    console.log(`📊 Found ${uniqueSymbols.length} unique securities to recalculate`)
    
    // Recalculate holdings for each security (no cash symbols)
    for (const { symbol } of uniqueSymbols) {
      console.log(`🔄 Recalculating holdings for: ${symbol}`)
      await updateSecurityHoldings(portfolioId, symbol)
    }

    // Get the updated portfolio with cash balance
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { cashBalance: true }
    })

    // Get all updated holdings
    const allHoldings = await prisma.holding.findMany({
      where: {
        portfolioId: portfolioId
      },
      orderBy: {
        symbol: 'asc'
      }
    })

    return {
      success: true,
      message: 'Holdings and cash balance recalculated successfully',
      portfolioId,
      symbolsProcessed: uniqueSymbols.length,
      cashBalance: portfolio?.cashBalance || 0,
      holdings: allHoldings.map((h: Holding) => ({
        symbol: h.symbol,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        updatedAt: h.updatedAt
      }))
    }

  } catch (error) {
    console.error('Holdings recalculation error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to recalculate holdings'
    })
  }
})

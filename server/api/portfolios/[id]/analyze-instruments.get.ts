import { getRequiredAuth } from '../../../lib/auth'
import { detectInstrumentRelationships, findRelatedInstruments } from '../../../lib/instrumentRelationships'
import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const auth = await getRequiredAuth(event)
    const portfolioId = getRouterParam(event, 'id')!
    
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

    // Auto-detect instrument relationships
    const detectionResult = await detectInstrumentRelationships(portfolioId)
    
    // Get all symbols in the portfolio
    const symbols = await prisma.transactions.findMany({
      where: { portfolioId },
      select: { symbol: true },
      distinct: ['symbol']
    })
    
    // Find known relationships for existing symbols
    const knownRelationships = []
    const symbolsWithRelationships = []
    
    for (const symbolRecord of symbols) {
      const symbol = symbolRecord.symbol
      if (symbol.startsWith('CASH_')) continue
      
      const related = await findRelatedInstruments(portfolioId, symbol)
      if (related.length > 1) {
        knownRelationships.push({
          primarySymbol: symbol,
          relatedSymbols: related,
          shouldCombine: true
        })
        symbolsWithRelationships.push(...related)
      }
    }
    
    // Get current holdings before any recalculation
    const currentHoldings = await prisma.holdings.findMany({
      where: { portfolioId },
      select: {
        symbol: true,
        quantity: true,
        avgPrice: true,
        currency: true
      }
    })
    
    return {
      success: true,
      portfolio: {
        id: portfolioId,
        name: portfolio.name
      },
      analysis: {
        totalSymbols: symbols.length,
        knownRelationships,
        detectedRelationships: detectionResult.detectedRelationships,
        suggestions: detectionResult.suggestions,
        currentHoldings: currentHoldings.map(h => ({
          symbol: h.symbol,
          quantity: h.quantity,
          avgPrice: h.avgPrice,
          totalValue: h.quantity * h.avgPrice,
          currency: h.currency
        }))
      },
      recommendations: [
        ...detectionResult.suggestions,
        ...(knownRelationships.length > 0 ? [
          `Found ${knownRelationships.length} known instrument relationships that will be automatically combined`
        ] : []),
        ...(detectionResult.detectedRelationships.length > 0 ? [
          `Detected ${detectionResult.detectedRelationships.length} potential relationships that may need manual configuration`
        ] : [])
      ]
    }

  } catch (error) {
    console.error('Error analyzing instrument relationships:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to analyze instrument relationships'
    })
  }
})

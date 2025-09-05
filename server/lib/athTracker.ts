/**
 * All-Time High (ATH) Tracking Service
 * Manages portfolio ATH values and history
 */

import prisma from './prisma.js'

export interface AthData {
  athValue: number | null
  athDate: Date | null
  isNewAth: boolean
  previousAth?: {
    value: number
    date: Date
  }
}

/**
 * Updates ATH for a portfolio if current total value exceeds previous ATH
 */
export async function updatePortfolioAth(portfolioId: string, currentTotalValue: number): Promise<AthData> {
  try {
    // Get current portfolio with ATH data
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: {
        athValue: true,
        athDate: true
      }
    })

    if (!portfolio) {
      throw new Error(`Portfolio ${portfolioId} not found`)
    }

    const currentAth = portfolio.athValue
    const currentAthDate = portfolio.athDate

    // Check if this is a new ATH
    const isNewAth = !currentAth || currentTotalValue > currentAth

    if (isNewAth) {
      // Store previous ATH in history if it exists
      if (currentAth && currentAthDate) {
        await prisma.athHistory.create({
          data: {
            portfolioId,
            athValue: currentAth,
            athDate: currentAthDate,
            newAthValue: currentTotalValue,
            surpassedAt: new Date()
          }
        })
      }

      // Update portfolio with new ATH
      await prisma.portfolio.update({
        where: { id: portfolioId },
        data: {
          athValue: currentTotalValue,
          athDate: new Date()
        }
      })

      console.log(`🎉 New ATH for portfolio ${portfolioId}: ${currentTotalValue.toFixed(0)} NOK`)

      return {
        athValue: currentTotalValue,
        athDate: new Date(),
        isNewAth: true,
        previousAth: currentAth && currentAthDate ? {
          value: currentAth,
          date: currentAthDate
        } : undefined
      }
    }

    return {
      athValue: currentAth,
      athDate: currentAthDate,
      isNewAth: false
    }
  } catch (error) {
    console.error('Error updating portfolio ATH:', error)
    throw error
  }
}

/**
 * Gets ATH history for a portfolio
 */
export async function getAthHistory(portfolioId: string, limit: number = 10) {
  return await prisma.athHistory.findMany({
    where: { portfolioId },
    orderBy: { surpassedAt: 'desc' },
    take: limit,
    select: {
      athValue: true,
      athDate: true,
      surpassedAt: true,
      newAthValue: true
    }
  })
}

/**
 * Calculates portfolio performance metrics including ATH-related stats
 */
export async function getPortfolioPerformanceMetrics(portfolioId: string) {
  // Get portfolio with holdings and market data
  const holdings = await prisma.holding.findMany({
    where: { portfolioId },
    include: {
      portfolio: {
        select: {
          athValue: true,
          athDate: true
        }
      }
    }
  })

  const portfolio = holdings[0]?.portfolio

  if (!portfolio) {
    throw new Error(`Portfolio ${portfolioId} not found`)
  }

  // Get market data for current prices
  const symbols = holdings.map((h: { symbol: string }) => h.symbol)
  const marketData = await prisma.marketData.findMany({
    where: {
      symbol: {
        in: symbols
      }
    }
  })

  // Calculate current market value
  const currentMarketValue = holdings.reduce((total: number, holding: { symbol: string; quantity: number; avgPrice: number }) => {
    const marketPrice = marketData.find((m: { symbol: string; currentPrice?: number | null }) => m.symbol === holding.symbol)?.currentPrice
    const price = marketPrice || holding.avgPrice
    return total + (holding.quantity * price)
  }, 0)

  // Calculate distance from ATH
  const athDrawdown = portfolio.athValue ? 
    ((portfolio.athValue - currentMarketValue) / portfolio.athValue) * 100 : 0

  // Days since ATH
  const daysSinceAth = portfolio.athDate ? 
    Math.floor((Date.now() - portfolio.athDate.getTime()) / (1000 * 60 * 60 * 24)) : null

  return {
    currentMarketValue,
    athValue: portfolio.athValue,
    athDate: portfolio.athDate,
    athDrawdown: athDrawdown,
    daysSinceAth,
    isAtAth: athDrawdown < 0.01 // Within 0.01% of ATH
  }
}

/**
 * Initializes ATH for existing portfolios (migration helper)
 */
export async function initializeAthForExistingPortfolios() {
  const portfolios = await prisma.portfolio.findMany({
    where: {
      athValue: null
    },
    include: {
      holdings: true
    }
  })

  console.log(`Initializing ATH for ${portfolios.length} portfolios...`)

  for (const portfolio of portfolios) {
    try {
      // Calculate current market value
      const currentMarketValue = portfolio.holdings.reduce((total: number, holding: { quantity: number; avgPrice: number }) => {
        return total + (holding.quantity * holding.avgPrice)
      }, 0)

      if (currentMarketValue > 0) {
        await prisma.portfolio.update({
          where: { id: portfolio.id },
          data: {
            athValue: currentMarketValue,
            athDate: new Date()
          }
        })

        console.log(`✅ Initialized ATH for ${portfolio.name}: ${currentMarketValue.toFixed(0)} NOK`)
      }
    } catch (error) {
      console.error(`Error initializing ATH for portfolio ${portfolio.id}:`, error)
    }
  }
}

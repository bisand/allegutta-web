/**
 * Enhanced portfolio endpoint with ATH tracking and daily changes
 */

import prisma from '../../../lib/prisma'

interface HoldingData {
  id: string
  portfolioId: string
  symbol: string
  isin?: string
  quantity: number
  avgPrice: number
  currency: string
}

interface MarketData {
  symbol: string
  currentPrice?: number
  regularMarketChangePercent?: number
  updatedAt: Date
}

export default defineEventHandler(async (event) => {
  try {
    const portfolioId = getRouterParam(event, 'id')
    
    if (!portfolioId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Portfolio ID is required'
      })
    }

    // Get portfolio with ATH data and cash balance
    const portfolio = await prisma.portfolios.findUnique({
      where: { id: portfolioId },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        athValue: true,
        athDate: true,
        cashBalance: true
      }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    // Get holdings for the portfolio
    const holdings = await prisma.holdings.findMany({
      where: { portfolioId }
    }) as HoldingData[]

    // Get market data for all symbols in holdings
    const symbols = holdings.map((h: HoldingData) => h.symbol)
    const marketDataList = await prisma.market_data.findMany({
      where: {
        symbol: { in: symbols }
      }
    }) as MarketData[]

    // Create a map for quick lookup
    const marketDataMap = new Map<string, MarketData>()
    marketDataList.forEach((md: MarketData) => {
      marketDataMap.set(md.symbol, md)
    })

    // Calculate ATH metrics
    let athDrawdown = 0
    let daysSinceAth = null
    let isAtAth = false
    let currentMarketValue = 0

    // Calculate current market value from holdings
    for (const holding of holdings) {
      const marketData = marketDataMap.get(holding.symbol)
      const currentPrice = marketData?.currentPrice || holding.avgPrice
      currentMarketValue += holding.quantity * currentPrice
    }

    // Calculate total portfolio value (market value + cash balance)
    const currentTotalValue = currentMarketValue + (portfolio.cashBalance || 0)

    if (portfolio.athValue && portfolio.athDate) {
      athDrawdown = ((portfolio.athValue - currentTotalValue) / portfolio.athValue) * 100
      daysSinceAth = Math.floor((Date.now() - portfolio.athDate.getTime()) / (1000 * 60 * 60 * 24))
      isAtAth = Math.abs(athDrawdown) < 0.1 // Within 0.1%
    }

    // Calculate daily change based on holdings and market data
    let dailyChangeValue = 0
    let totalMarketValue = 0
    const marketDataUpdates: Date[] = []
    
    for (const holding of holdings) {
      const marketData = marketDataMap.get(holding.symbol)
      
      if (marketData) {
        marketDataUpdates.push(new Date(marketData.updatedAt))
        
        const currentPrice = marketData.currentPrice || 0
        const marketValue = holding.quantity * currentPrice
        const changePercent = marketData.regularMarketChangePercent || 0
        const changeValue = (marketValue * changePercent) / 100
        
        dailyChangeValue += changeValue
        totalMarketValue += marketValue
      } else {
        // Use average price if no market data
        const marketValue = holding.quantity * holding.avgPrice
        totalMarketValue += marketValue
      }
    }
    
    const dailyChangePercentage = totalMarketValue > 0 ? (dailyChangeValue / totalMarketValue) * 100 : 0
    
    // Get most recent market data update
    const marketDataLastUpdated = marketDataUpdates.length > 0 
      ? marketDataUpdates.sort((a, b) => b.getTime() - a.getTime())[0]
      : portfolio.updatedAt

    // Enhanced portfolio data
    const enhancedData = {
      // ATH tracking
      athValue: portfolio.athValue,
      athDate: portfolio.athDate,
      athDrawdown,
      daysSinceAth,
      isAtAth,
      
      // Daily change
      dailyChangeValue,
      dailyChangePercentage,
      
      // Last updated
      lastUpdated: portfolio.updatedAt,
      marketDataLastUpdated
    }

    return enhancedData

  } catch (error) {
    console.error('Error fetching enhanced portfolio data:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch enhanced portfolio data'
    })
  }
})

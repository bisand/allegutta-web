const { PrismaClient } = require('@prisma/client')
const { MarketDataService } = require('../server/lib/marketData.js')

const prisma = new PrismaClient()

async function testMarketData() {
  console.log('Testing market data service...')

  try {
    // Check current holdings
    const holdings = await prisma.holding.findMany({
      include: {
        portfolio: {
          include: {
            user: true
          }
        }
      }
    })

    console.log(`Found ${holdings.length} holdings:`)
    holdings.forEach(holding => {
      console.log(`- ${holding.symbol}: ${holding.quantity} shares at avg $${holding.avgPrice}, current: $${holding.currentPrice || 'not set'}`)
    })

    // Test the market data service with a simple symbol
    const apiKey = process.env.NUXT_ALPHA_VANTAGE_API_KEY
    if (!apiKey) {
      console.error('No Alpha Vantage API key found')
      return
    }

    const marketDataService = new MarketDataService(apiKey)
    
    console.log('\nTesting Alpha Vantage API with AAPL...')
    const quote = await marketDataService.getQuote('AAPL')
    
    if (quote) {
      console.log('Quote received:', quote)
    } else {
      console.log('No quote received')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testMarketData()

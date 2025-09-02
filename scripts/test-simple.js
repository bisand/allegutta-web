import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function checkHoldings() {
  console.log('Checking holdings...')

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

    // Test a simple fetch to Alpha Vantage
    const apiKey = process.env.NUXT_ALPHA_VANTAGE_API_KEY
    console.log(`API Key available: ${apiKey ? 'Yes' : 'No'}`)
    
    if (apiKey) {
      console.log('\nTesting direct Alpha Vantage API call...')
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`
      
      try {
        const response = await fetch(url)
        const data = await response.json()
        console.log('API Response:', JSON.stringify(data, null, 2))
      } catch (error) {
        console.error('API call failed:', error)
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkHoldings()

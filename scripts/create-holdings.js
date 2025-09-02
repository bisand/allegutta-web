import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createHoldings() {
  console.log('Creating sample holdings...')

  // Get the test portfolio
  const portfolio = await prisma.portfolio.findFirst({
    where: {
      user: {
        kindeId: 'test_user_1'
      }
    }
  })

  if (!portfolio) {
    console.error('No test portfolio found!')
    return
  }

  // Create holdings based on the transactions
  const holdings = [
    {
      portfolioId: portfolio.id,
      symbol: 'AAPL',
      quantity: 10, // From BUY transaction
      avgPrice: 150.00,
      currentPrice: null, // Will be updated by market data worker
      currency: 'USD'
    },
    {
      portfolioId: portfolio.id,
      symbol: 'MSFT',
      quantity: 5, // From BUY transaction
      avgPrice: 300.00,
      currentPrice: null, // Will be updated by market data worker
      currency: 'USD'
    },
    {
      portfolioId: portfolio.id,
      symbol: 'EQNR', // Equinor (correct ticker)
      quantity: 50,
      avgPrice: 280.00,
      currentPrice: null, // Will be updated by market data worker (Yahoo will use EQNR.OL)
      currency: 'NOK'
    },
    {
      portfolioId: portfolio.id,
      symbol: 'NHY', // Norsk Hydro (Norwegian stock)
      quantity: 100,
      avgPrice: 45.00,
      currentPrice: null, // Will be updated by market data worker (Yahoo will use NHY.OL)
      currency: 'NOK'
    }
  ]

  // Delete existing holdings first to avoid duplicates
  await prisma.holding.deleteMany({
    where: {
      portfolioId: portfolio.id
    }
  })

  for (const holding of holdings) {
    await prisma.holding.create({ data: holding })
  }

  console.log(`Created ${holdings.length} sample holdings`)
  console.log('Holdings created successfully!')
}

createHoldings()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

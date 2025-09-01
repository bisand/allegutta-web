import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('Seeding database...')

  // Delete existing test user if exists
  await prisma.user.deleteMany({
    where: { kindeId: 'test_user_1' }
  })

  // Create a test user with admin permissions
  const user = await prisma.user.create({
    data: {
      kindeId: 'test_user_1',
      email: 'admin@example.com',
      firstName: 'Test',
      lastName: 'Admin',
      roles: JSON.stringify(['admin', 'portfolio_admin']),
      permissions: JSON.stringify(['admin:manage', 'read:portfolios', 'write:portfolios'])
    }
  })

  // Create a portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      name: 'My Portfolio',
      description: 'Test portfolio for development',
      userId: user.id,
      isDefault: true
    }
  })

  // Create some sample transactions
  const transactions = [
    {
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150.00,
      fees: 9.99,
      date: new Date('2024-01-15')
    },
    {
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 5,
      price: 145.00,
      fees: 9.99,
      date: new Date('2024-02-15')
    },
    {
      symbol: 'TSLA',
      type: 'BUY',
      quantity: 20,
      price: 200.00,
      fees: 9.99,
      date: new Date('2024-01-20')
    },
    {
      symbol: 'GOOGL',
      type: 'BUY',
      quantity: 5,
      price: 2500.00,
      fees: 9.99,
      date: new Date('2024-03-01')
    }
  ]

  for (const transaction of transactions) {
    await prisma.transaction.create({
      data: {
        ...transaction,
        portfolioId: portfolio.id
      }
    })
  }

  // Create holdings based on transactions
  const holdings = [
    {
      symbol: 'AAPL',
      quantity: 15,
      avgPrice: 148.33,
      currentPrice: 175.00
    },
    {
      symbol: 'TSLA',
      quantity: 20,
      avgPrice: 200.50,
      currentPrice: 180.00
    },
    {
      symbol: 'GOOGL',
      quantity: 5,
      avgPrice: 2502.00,
      currentPrice: 2650.00
    }
  ]

  for (const holding of holdings) {
    await prisma.holding.create({
      data: {
        ...holding,
        portfolioId: portfolio.id
      }
    })
  }

  console.log('Database seeded successfully!')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

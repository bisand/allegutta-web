import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  console.log('Seeding database...')

  // Clean up any existing test data first - more comprehensive cleanup
  console.log('Cleaning up existing test data...')
  
  // Delete all transactions for test users
  await prisma.transaction.deleteMany({
    where: {
      portfolio: {
        user: {
          kindeId: 'test_user_1'
        }
      }
    }
  })
  
  // Delete all holdings for test users  
  await prisma.holding.deleteMany({
    where: {
      portfolio: {
        user: {
          kindeId: 'test_user_1'
        }
      }
    }
  })
  
  // Delete all portfolios for test users
  await prisma.portfolio.deleteMany({
    where: {
      user: {
        kindeId: 'test_user_1'
      }
    }
  })
  
  // Delete test users
  await prisma.user.deleteMany({
    where: { kindeId: 'test_user_1' }
  })

  console.log('Cleanup completed, creating fresh test data...')

  // Create test user for development
  const testUser = await prisma.user.create({
    data: {
      kindeId: 'test_user_1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      picture: null,
      roles: JSON.stringify(['user']),
      permissions: JSON.stringify(['read:portfolios', 'write:portfolios'])
    }
  })

  console.log('Created test user:', testUser.email)

  // Create a default portfolio for the test user
  const defaultPortfolio = await prisma.portfolio.create({
    data: {
      name: 'My Portfolio',
      description: 'Default portfolio for testing',
      userId: testUser.id,
      isDefault: true
    }
  })

  console.log('Created default portfolio:', defaultPortfolio.name)

  // Add some sample transactions
  const transactions = [
    {
      type: 'BUY',
      symbol: 'AAPL',
      quantity: 10,
      price: 150.00,
      date: new Date('2024-01-15'),
      portfolioId: defaultPortfolio.id
    },
    {
      type: 'BUY', 
      symbol: 'MSFT',
      quantity: 5,
      price: 300.00,
      date: new Date('2024-02-01'),
      portfolioId: defaultPortfolio.id
    },
    {
      type: 'DIVIDEND',
      symbol: 'AAPL',
      quantity: 0,
      price: 2.50,
      date: new Date('2024-03-15'),
      portfolioId: defaultPortfolio.id
    }
  ]

  for (const transaction of transactions) {
    await prisma.transaction.create({ data: transaction })
  }

  console.log(`Created ${transactions.length} sample transactions`)

  console.log('Database seeded successfully!')
  console.log('Test user: test@example.com (kindeId: test_user_1)')
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// Test script to verify currency functionality
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCurrency() {
  try {
    console.log('🧪 Testing Currency Support...\n')

    // Test 1: Create a portfolio with USD currency
    console.log('1. Creating USD portfolio...')
    const usdPortfolio = await prisma.portfolio.create({
      data: {
        name: 'USD Test Portfolio',
        description: 'Testing USD currency support',
        currency: 'USD',
        userId: 'test-user-id'
      }
    })
    console.log(`✅ Created portfolio: ${usdPortfolio.name} (${usdPortfolio.currency})`)

    // Test 2: Create a transaction with USD currency
    console.log('\n2. Creating USD transaction...')
    const usdTransaction = await prisma.transaction.create({
      data: {
        portfolioId: usdPortfolio.id,
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10,
        price: 150.00,
        fees: 5.00,
        currency: 'USD',
        date: new Date(),
        notes: 'Test USD transaction'
      }
    })
    console.log(`✅ Created transaction: ${usdTransaction.symbol} in ${usdTransaction.currency}`)

    // Test 3: Create a cash transaction that should create CASH_USD
    console.log('\n3. Creating USD cash deposit...')
    const cashTransaction = await prisma.transaction.create({
      data: {
        portfolioId: usdPortfolio.id,
        symbol: 'CASH_USD',
        type: 'DEPOSIT',
        quantity: 2000,
        price: 1.00,
        fees: 0,
        currency: 'USD',
        date: new Date(),
        notes: 'USD cash deposit'
      }
    })
    console.log(`✅ Created cash transaction: ${cashTransaction.symbol} in ${cashTransaction.currency}`)

    // Test 4: Check if holdings are created correctly
    console.log('\n4. Checking holdings...')
    const holdings = await prisma.holding.findMany({
      where: {
        portfolioId: usdPortfolio.id
      }
    })
    
    holdings.forEach(holding => {
      console.log(`📊 Holding: ${holding.symbol} (${holding.currency}) - Qty: ${holding.quantity}`)
    })

    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    await prisma.transaction.deleteMany({
      where: { portfolioId: usdPortfolio.id }
    })
    await prisma.holding.deleteMany({
      where: { portfolioId: usdPortfolio.id }
    })
    await prisma.portfolio.delete({
      where: { id: usdPortfolio.id }
    })
    console.log('✅ Cleanup complete')

    console.log('\n🎉 Currency support test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCurrency()

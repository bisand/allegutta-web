import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testForeignKeyFix() {
  console.log('🧪 Testing foreign key constraint fixes...')

  try {
    // Get the test portfolio
    const portfolio = await prisma.portfolio.findFirst({
      where: {
        user: {
          kindeId: 'test_user_1'
        }
      }
    })

    if (!portfolio) {
      console.log('❌ No test portfolio found. Run seed script first.')
      return
    }

    console.log(`📁 Using portfolio: ${portfolio.name} (${portfolio.id})`)

    // Clear existing transactions to start fresh
    await prisma.transaction.deleteMany({
      where: { portfolioId: portfolio.id }
    })
    
    console.log('🧹 Cleared existing transactions')

    // Test creating a transaction with an ISIN that doesn't exist in MarketData
    console.log('🔍 Creating transaction with ISIN that doesn\'t exist in MarketData...')
    
    const testTransaction = await prisma.transaction.create({
      data: {
        portfolioId: portfolio.id,
        symbol: 'TEST',
        isin: 'TEST123456789012', // This ISIN doesn't exist in MarketData
        type: 'BUY',
        quantity: 10,
        price: 100,
        fees: 5,
        amount: -1005,
        currency: 'NOK',
        date: new Date('2025-09-03'),
        notes: 'Test transaction for foreign key validation'
      }
    })

    console.log('✅ Transaction created successfully:', {
      id: testTransaction.id,
      symbol: testTransaction.symbol,
      isin: testTransaction.isin,
      type: testTransaction.type
    })

    // Test creating a transaction with a NULL ISIN
    console.log('🔍 Creating transaction with NULL ISIN...')
    
    const testTransaction2 = await prisma.transaction.create({
      data: {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK',
        isin: null, // NULL ISIN
        type: 'DEPOSIT',
        quantity: 0,
        price: 0,
        fees: 0,
        amount: 1000,
        currency: 'NOK',
        date: new Date('2025-09-03'),
        notes: 'Test cash transaction with NULL ISIN'
      }
    })

    console.log('✅ Transaction with NULL ISIN created successfully:', {
      id: testTransaction2.id,
      symbol: testTransaction2.symbol,
      isin: testTransaction2.isin,
      type: testTransaction2.type
    })

    // Test creating a holding with an ISIN that doesn't exist in MarketData
    console.log('🔍 Creating holding with ISIN that doesn\'t exist in MarketData...')
    
    const testHolding = await prisma.holding.create({
      data: {
        portfolioId: portfolio.id,
        symbol: 'TEST',
        isin: 'TEST123456789012', // This ISIN doesn't exist in MarketData
        quantity: 10,
        averagePrice: 100,
        currency: 'NOK'
      }
    })

    console.log('✅ Holding created successfully:', {
      id: testHolding.id,
      symbol: testHolding.symbol,
      isin: testHolding.isin,
      quantity: testHolding.quantity
    })

    console.log('\n🎉 All tests passed! Foreign key constraint issues are resolved.')
    console.log('✅ Transactions and holdings can be created without requiring MarketData records.')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.message.includes('foreign key constraint')) {
      console.log('💡 The foreign key constraint issue still exists.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testForeignKeyFix()

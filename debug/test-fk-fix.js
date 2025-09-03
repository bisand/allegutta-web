import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testTransactionCreation() {
  console.log('🧪 Testing transaction creation without foreign key constraints...')

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

    // Test creating transactions with different ISINs
    const testTransactions = [
      {
        portfolioId: portfolio.id,
        symbol: 'AAPL',
        isin: 'US0378331005', // Apple ISIN
        type: 'BUY',
        quantity: 10,
        price: 150.00,
        fees: 0,
        amount: -1500.00,
        currency: 'NOK',
        date: new Date('2025-09-02'),
        saldo: 8500.00,
        notes: 'Test Apple purchase'
      },
      {
        portfolioId: portfolio.id,
        symbol: 'EQNR',
        isin: 'NO0010096985', // Equinor ISIN
        type: 'BUY',
        quantity: 50,
        price: 280.00,
        fees: 15.00,
        amount: -14015.00,
        currency: 'NOK',
        date: new Date('2025-09-01'),
        saldo: -5515.00,
        notes: 'Test Equinor purchase'
      },
      {
        portfolioId: portfolio.id,
        symbol: 'UNKNOWN',
        isin: 'XX0000000000', // Non-existent ISIN
        type: 'SELL',
        quantity: 5,
        price: 100.00,
        fees: 10.00,
        amount: 490.00,
        currency: 'NOK',
        date: new Date('2025-09-03'),
        saldo: -5025.00,
        notes: 'Test unknown security'
      }
    ]

    console.log('💾 Creating test transactions...')
    
    for (const txData of testTransactions) {
      try {
        const transaction = await prisma.transaction.create({
          data: txData
        })
        console.log(`✅ Created transaction: ${transaction.symbol} (${transaction.isin || 'no ISIN'})`)
      } catch (error) {
        console.error(`❌ Failed to create transaction for ${txData.symbol}:`, error.message)
        return false
      }
    }

    // Verify all transactions were created
    const createdTransactions = await prisma.transaction.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { date: 'asc' }
    })

    console.log(`\n📊 Successfully created ${createdTransactions.length} transactions:`)
    createdTransactions.forEach(tx => {
      console.log(`   ${tx.date.toISOString().split('T')[0]} - ${tx.symbol} (${tx.isin || 'no ISIN'}): ${tx.type} ${tx.quantity}@${tx.price}`)
    })

    console.log('\n✅ Foreign key constraint issue is RESOLVED!')
    console.log('✅ Transactions can be created with any ISIN values!')
    console.log('✅ Market data relationships are now optional!')

    return true

  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

testTransactionCreation()

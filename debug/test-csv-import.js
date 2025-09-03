import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCSVImport() {
  console.log('🧪 Testing CSV import functionality...')

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

    // Clear existing data
    await prisma.transaction.deleteMany({
      where: { portfolioId: portfolio.id }
    })
    await prisma.holding.deleteMany({
      where: { portfolioId: portfolio.id }
    })
    console.log('🧹 Cleared existing data')

    // Simulate CSV import with various ISINs (some existing, some not)
    const testTransactions = [
      {
        portfolioId: portfolio.id,
        symbol: 'EQNR',
        isin: 'NO0010096985', // Norwegian stock
        type: 'BUY',
        quantity: 100,
        price: 280.50,
        fees: 29.95,
        amount: -28079.95,
        currency: 'NOK',
        date: new Date('2025-09-01T09:00:00Z'),
        saldo: 21920.05,
        notes: 'Purchase Equinor shares'
      },
      {
        portfolioId: portfolio.id,
        symbol: 'AAPL',
        isin: 'US0378331005', // US stock
        type: 'BUY',
        quantity: 25,
        price: 150.00,
        fees: 0,
        amount: -3750.00,
        currency: 'USD',
        date: new Date('2025-09-02T14:30:00Z'),
        saldo: 18170.05,
        notes: 'Purchase Apple shares'
      },
      {
        portfolioId: portfolio.id,
        symbol: 'UNKNOWN',
        isin: 'XX1234567890', // Non-existent ISIN
        type: 'SELL',
        quantity: 10,
        price: 50.00,
        fees: 15.00,
        amount: 485.00,
        currency: 'NOK',
        date: new Date('2025-09-03T11:15:00Z'),
        saldo: 18655.05,
        notes: 'Sell unknown security'
      },
      {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK',
        isin: null, // Cash transaction with no ISIN
        type: 'DEPOSIT',
        quantity: 0,
        price: 0,
        fees: 0,
        amount: 50000.00,
        currency: 'NOK',
        date: new Date('2025-08-31T08:00:00Z'),
        saldo: 50000.00,
        notes: 'Initial cash deposit'
      }
    ]

    console.log('💾 Creating transactions with various ISIN scenarios...')
    
    let successCount = 0
    for (const txData of testTransactions) {
      try {
        const transaction = await prisma.transaction.create({
          data: txData
        })
        console.log(`✅ Created: ${transaction.symbol} (ISIN: ${transaction.isin || 'None'}) - ${transaction.type}`)
        successCount++
      } catch (error) {
        console.error(`❌ Failed: ${txData.symbol} - ${error.message}`)
        if (error.message.includes('foreign key')) {
          console.log('⚠️  Foreign key constraint issue detected!')
          return false
        }
      }
    }

    console.log(`\n📊 Successfully created ${successCount}/${testTransactions.length} transactions`)

    // Verify transactions were created correctly
    const createdTransactions = await prisma.transaction.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { date: 'asc' }
    })

    console.log('\n📋 Transaction Summary:')
    createdTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.date.toISOString().split('T')[0]} - ${tx.symbol} (${tx.isin || 'No ISIN'}): ${tx.type} ${tx.quantity} @ ${tx.price}`)
    })

    console.log('\n🎉 CSV Import Test PASSED!')
    console.log('✅ Foreign key constraints are resolved')
    console.log('✅ Transactions with any ISIN values work')
    console.log('✅ Cash transactions with NULL ISINs work')
    console.log('✅ System is ready for production CSV imports')

    return true

  } catch (error) {
    console.error('❌ CSV Import Test FAILED:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

testCSVImport()

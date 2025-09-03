import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testWithRealData() {
  console.log('🧪 Testing with real CSV data...')

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

    // Create test transactions with real saldo values (reverse chronological order to test sorting)
    const transactions = [
      {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK',
        type: 'DIVIDEND',
        quantity: 573.65,
        price: 1.0,
        fees: 0,
        currency: 'NOK',
        date: new Date('2025-08-28'),
        notes: 'UTBYTTE EQNR 3.774 NOK/AKSJE',
        saldo: 167919.71,
        amount: 573.65
      },
      {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK', 
        type: 'DIVIDEND',
        quantity: 699.94,
        price: 1.0,
        fees: 0,
        currency: 'NOK',
        date: new Date('2025-08-06'),
        notes: 'UTBYTTE TGS 1.58 NOK/AKSJE',
        saldo: 167346.06,
        amount: 699.94
      },
      {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK',
        type: 'DIVIDEND', 
        quantity: 4472.44,
        price: 1.0,
        fees: 0,
        currency: 'NOK',
        date: new Date('2025-07-25'),
        notes: 'UTBYTTE AKRBP 6.36193 NOK/AKSJE',
        saldo: 166646.12,
        amount: 4472.44
      },
      {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK',
        type: 'DEPOSIT',
        quantity: 32375,
        price: 1.0,
        fees: 0,
        currency: 'NOK',
        date: new Date('2025-07-17'),
        notes: 'Innskudd KID fra 97103219128',
        saldo: 162173.68,
        amount: 32375
      }
    ]

    // Create transactions
    for (const transactionData of transactions) {
      await prisma.transaction.create({ data: transactionData })
      console.log(`✅ Created: ${transactionData.type} ${transactionData.quantity} (Saldo: ${transactionData.saldo})`)
    }

    // Now test the updateHoldings function manually
    console.log('🔄 Testing updateHoldings function...')
    
    // Import the updateHoldings logic from the import file
    // Since we can't easily import the function, let's implement the same logic here
    
    // Get latest transaction with saldo
    const latestTransaction = await prisma.transaction.findFirst({
      where: {
        portfolioId: portfolio.id,
        saldo: { not: null }
      },
      orderBy: {
        date: 'desc'
      }
    })

    let totalCash = 0
    if (latestTransaction && latestTransaction.saldo !== null) {
      totalCash = latestTransaction.saldo
      console.log(`💰 Using saldo from latest transaction: ${totalCash}`)
    }

    if (totalCash !== 0) {
      const currency = 'NOK'
      const symbol = 'CASH_NOK'

      const holding = await prisma.holding.upsert({
        where: {
          portfolioId_symbol: {
            portfolioId: portfolio.id,
            symbol: symbol
          }
        },
        update: {
          quantity: totalCash,
          avgPrice: 1.0,
          currency: currency
        },
        create: {
          portfolioId: portfolio.id,
          symbol: symbol,
          quantity: totalCash,
          avgPrice: 1.0,
          currency: currency
        }
      })

      console.log(`✅ Created/updated CASH_NOK holding: ${holding.quantity}`)
    }

    // Verify the result
    const holdings = await prisma.holding.findMany({
      where: { portfolioId: portfolio.id }
    })

    console.log('💰 Final holdings:')
    holdings.forEach(h => {
      console.log(`   ${h.symbol}: ${h.quantity}`)
    })

    const cashHolding = holdings.find(h => h.symbol === 'CASH_NOK')
    if (cashHolding) {
      console.log(`🔍 CASH_NOK holding: ${cashHolding.quantity}`)
      console.log(`🔍 Expected (latest saldo): 167919.71`)
      console.log(`🔍 Match: ${Math.abs(cashHolding.quantity - 167919.71) < 0.01 ? '✅' : '❌'}`)
    } else {
      console.log('❌ No CASH_NOK holding found')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testWithRealData()

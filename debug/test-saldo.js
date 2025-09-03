import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSaldoValidation() {
  console.log('🧪 Testing saldo-based validation system...')

  try {            currency: 'USD'
          },  // Get the test portfolio
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

    // Check current cash balance
    const currentCash = await prisma.holding.findFirst({
      where: {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK'
      }
    })

    console.log(`💰 Current cash balance: ${currentCash?.quantity || 0} NOK`)

    // Create a transaction with saldo that creates a discrepancy
    const brokerSaldo = 15000.0  // Broker says we should have 15,000 NOK
    const transactionAmount = 1000.0  // But we're adding only 1,000 NOK

    console.log(`📊 Creating transaction with amount ${transactionAmount} but saldo ${brokerSaldo}`)

    const transaction = await prisma.transaction.create({
      data: {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK',
        type: 'DEPOSIT',
        quantity: transactionAmount,
        price: 1.0,
        fees: 0,
        currency: 'NOK',
        date: new Date(),
        notes: 'Test deposit with saldo validation',
        saldo: brokerSaldo  // This should trigger automatic adjustment
      }
    })

    console.log(`✅ Created transaction: ${transaction.id}`)

    // Now let's see if the recalculateCashHoldings function would create an adjustment
    // (Note: We need to call it manually since this is outside the API endpoint)
    console.log(`🔧 Simulating cash recalculation with saldo validation...`)

    // Get all transactions for this portfolio in chronological order
    const allTransactions = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolio.id
      },
      orderBy: {
        date: 'asc'
      }
    })

    console.log(`📊 Processing ${allTransactions.length} transactions`)

    let runningCashBalance = 0

    // Process each transaction chronologically
    for (const tx of allTransactions) {
      const amount = tx.quantity * tx.price
      const fees = tx.fees || 0

      let cashImpact = 0

      if (tx.symbol.startsWith('CASH_')) {
        switch (tx.type) {
          case 'DEPOSIT':
          case 'REFUND':
          case 'DIVIDEND':
          case 'DIVIDEND_REINVEST':
          case 'LIQUIDATION':
          case 'REDEMPTION':
          case 'DECIMAL_LIQUIDATION':
          case 'SPIN_OFF_IN':
          case 'TRANSFER_IN':
            cashImpact = amount - fees
            break
          case 'WITHDRAWAL':
          case 'DECIMAL_WITHDRAWAL':
          case 'INTEREST_CHARGE': {
            const withdrawalAmount = amount > 0 ? -amount : amount
            cashImpact = withdrawalAmount - fees
            break
          }
          case 'SALDO_ADJUSTMENT':
            cashImpact = amount - fees
            break
        }
      } else {
        // Stock transactions affect cash
        switch (tx.type) {
          case 'BUY':
          case 'RIGHTS_ALLOCATION':
          case 'RIGHTS_ISSUE':
            cashImpact = -(amount + fees)
            break
          case 'SELL':
          case 'DIVIDEND':
          case 'DIVIDEND_REINVEST':
          case 'LIQUIDATION':
          case 'REDEMPTION':
          case 'DECIMAL_LIQUIDATION':
          case 'SPIN_OFF_IN':
          case 'EXCHANGE_IN':
            cashImpact = amount - fees
            break
          case 'EXCHANGE_OUT':
            cashImpact = -(amount + fees)
            break
          case 'SPLIT':
          case 'MERGER':
            cashImpact = -fees
            break
        }
      }

      runningCashBalance += cashImpact
      console.log(`🔄 ${tx.type} ${tx.symbol}: impact=${cashImpact}, running=${runningCashBalance}, saldo=${tx.saldo || 'N/A'}`)
    }

    console.log(`🎯 Final calculated cash balance: ${runningCashBalance} NOK`)

    // Check if we have a recent saldo value to validate against
    const latestTransactionWithSaldo = await prisma.transaction.findFirst({
      where: {
        portfolioId: portfolio.id,
        saldo: { not: null }
      },
      orderBy: {
        date: 'desc'
      }
    })

    if (latestTransactionWithSaldo?.saldo !== null && latestTransactionWithSaldo?.saldo !== undefined) {
      const brokerSaldoValue = latestTransactionWithSaldo.saldo
      const discrepancy = runningCashBalance - brokerSaldoValue

      console.log(`📊 Saldo validation: calculated=${runningCashBalance}, broker=${brokerSaldoValue}, discrepancy=${discrepancy}`)

      if (Math.abs(discrepancy) > 0.01) {
        console.log(`⚠️  Saldo discrepancy detected: ${discrepancy} NOK. Creating automatic adjustment...`)

        // Create a SALDO_ADJUSTMENT transaction
        const adjustmentTx = await prisma.transaction.create({
          data: {
            portfolioId: portfolio.id,
            symbol: 'CASH_NOK',
            type: 'SALDO_ADJUSTMENT',
            quantity: -discrepancy,  // Negative to correct the discrepancy
            price: 1.0,
            fees: 0,
            currency: 'NOK',
            date: new Date(latestTransactionWithSaldo.date.getTime() + 1000), // 1 second after
            notes: `Automatic adjustment to match broker saldo (${brokerSaldoValue}). Corrected discrepancy of ${discrepancy}.`,
            saldo: brokerSaldoValue
          }
        })

        console.log(`✅ Created saldo adjustment transaction: ${adjustmentTx.id}`)
        console.log(`🎯 New balance should be: ${brokerSaldoValue} NOK`)

        // Update the cash holding
        await prisma.holding.upsert({
          where: {
            portfolioId_symbol: {
              portfolioId: portfolio.id,
              symbol: 'CASH_NOK'
            }
          },
          update: {
            quantity: brokerSaldoValue,
            avgPrice: 1.0,
            currency: 'NOK'
          },
          create: {
            portfolioId: portfolio.id,
            symbol: 'CASH_NOK',
            quantity: brokerSaldoValue,
            avgPrice: 1.0,
            currency: 'NOK'
          }
        })

        console.log(`💰 Updated cash holding to match broker saldo: ${brokerSaldoValue} NOK`)
      } else {
        console.log(`✅ No adjustment needed. Calculated balance matches broker saldo.`)
      }
    }

    // Show final state
    const finalCash = await prisma.holding.findFirst({
      where: {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK'
      }
    })

    console.log(`🏁 Final cash holding: ${finalCash?.quantity || 0} NOK`)

    // Show all SALDO_ADJUSTMENT transactions
    const adjustments = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolio.id,
        type: 'SALDO_ADJUSTMENT'
      },
      orderBy: {
        date: 'asc'
      }
    })

    if (adjustments.length > 0) {
      console.log(`📋 Saldo adjustment transactions:`)
      for (const adj of adjustments) {
        console.log(`   - ${adj.date.toISOString()}: ${adj.quantity} NOK (${adj.notes})`)
      }
    }

  } catch (error) {
    console.error('❌ Error testing saldo validation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSaldoValidation()

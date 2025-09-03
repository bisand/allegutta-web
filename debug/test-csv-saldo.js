import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testCSVSaldoImport() {
  console.log('🧪 Testing CSV import with saldo validation...')

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
    
    await prisma.holding.deleteMany({
      where: { portfolioId: portfolio.id }
    })

    console.log('🧹 Cleared existing transactions and holdings')

    // Create test CSV data with saldo progression that should trigger adjustment
    const csvData = `Bokføringsdag	Verdipapir	ISIN	Transaksjonstype	Transaksjonstekst	Antall	Kurs	Beløp	Avgift	Saldo
2025-01-01	CASH_NOK		INNSKUDD	Deposit funds	10000	1	10000	0	10000
2025-01-02	AAPL	US0378331005	KJØPT	Buy Apple stock	10	150	1500	10	8490
2025-01-03	AAPL	US0378331005	UTBYTTE	Apple dividend	0	1	100	0	8590
2025-01-04	MSFT	US5949181045	KJØPT	Buy Microsoft stock	5	200	1000	10	7580
2025-01-05	CASH_NOK		INNSKUDD	Another deposit	2000	1	2000	0	12000`

    console.log('📊 Test CSV with saldo progression:')
    console.log('   - Start: 10,000 NOK deposit → Saldo: 10,000')
    console.log('   - Buy AAPL: -1,510 NOK → Saldo: 8,490')  
    console.log('   - AAPL dividend: +100 NOK → Saldo: 8,590')
    console.log('   - Buy MSFT: -1,010 NOK → Saldo: 7,580')
    console.log('   - Final deposit: +2,000 NOK → Expected calc: 9,580, Saldo: 12,000')
    console.log('   - Should create adjustment: +2,420 NOK (12,000 - 9,580)')

    // Simulate the CSV import endpoint logic
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split('\t')
    
    console.log(`📋 CSV Headers: ${headers.join(', ')}`)

    const transactions = []
    
    // Parse each transaction
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t')
      const csvRow = {}
      headers.forEach((header, index) => {
        csvRow[header] = values[index]
      })

      console.log(`📊 Processing line ${i}: ${csvRow.Transaksjonstype} ${csvRow.Verdipapir || 'CASH'} → Saldo: ${csvRow.Saldo}`)

      // Map transaction type
      const typeMap = {
        'INNSKUDD': 'DEPOSIT',
        'KJØPT': 'BUY', 
        'UTBYTTE': 'DIVIDEND'
      }
      
      const transactionType = typeMap[csvRow.Transaksjonstype]
      let symbol = csvRow.Verdipapir ? csvRow.Verdipapir.toUpperCase() : null
      
      // Handle cash transactions
      if (!symbol || symbol.trim() === '') {
        if (['DEPOSIT', 'DIVIDEND'].includes(transactionType)) {
          symbol = 'CASH_NOK'
        }
      }
      
      // Special handling for dividends - they should be cash transactions
      if (transactionType === 'DIVIDEND') {
        symbol = 'CASH_NOK'
      }

      const quantity = parseFloat(csvRow.Antall) || parseFloat(csvRow.Beløp)
      const price = parseFloat(csvRow.Kurs) || 1.0
      const fees = parseFloat(csvRow.Avgift) || 0
      const saldo = parseFloat(csvRow.Saldo) || null

      const transaction = {
        portfolioId: portfolio.id,
        symbol: symbol,
        isin: csvRow.ISIN || null,
        type: transactionType,
        quantity: quantity,
        price: price,
        fees: fees,
        currency: 'NOK',
        date: new Date(csvRow.Bokføringsdag),
        notes: csvRow.Transaksjonstekst || null,
        saldo: saldo
      }

      transactions.push(transaction)
    }

    // Create transactions in batch
    console.log(`💾 Creating ${transactions.length} transactions...`)
    await prisma.transaction.createMany({
      data: transactions
    })

    // Update holdings for each unique symbol
    const uniqueSymbols = [...new Set(transactions.map(t => t.symbol))]
    for (const symbol of uniqueSymbols) {
      if (!symbol.startsWith('CASH_')) {
        await updateStockHoldings(portfolio.id, symbol)
      }
    }

    // Test the saldo validation by calling recalculateCashHoldings
    console.log('🔧 Running saldo-based cash recalculation...')
    await recalculateCashHoldings(portfolio.id, 'NOK')

    // Check final state
    const finalCash = await prisma.holding.findFirst({
      where: {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK'
      }
    })

    console.log(`🏁 Final cash holding: ${finalCash?.quantity || 0} NOK`)

    // Show any saldo adjustment transactions created
    const adjustments = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolio.id,
        type: 'SALDO_ADJUSTMENT'
      }
    })

    if (adjustments.length > 0) {
      console.log(`📋 Saldo adjustment transactions created:`)
      for (const adj of adjustments) {
        console.log(`   - ${adj.date.toISOString()}: ${adj.quantity} NOK (${adj.notes})`)
      }
    } else {
      console.log('📋 No saldo adjustments needed - perfect match!')
    }

    // Show all transactions for verification
    const allTx = await prisma.transaction.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { date: 'asc' }
    })

    console.log('📊 All transactions:')
    for (const tx of allTx) {
      console.log(`   ${tx.date.toISOString().split('T')[0]} | ${tx.type.padEnd(15)} | ${tx.symbol.padEnd(10)} | ${tx.quantity.toString().padStart(8)} | ${(tx.saldo || 0).toString().padStart(8)}`)
    }

  } catch (error) {
    console.error('❌ Error testing CSV saldo import:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function to update stock holdings
async function updateStockHoldings(portfolioId, symbol) {
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      symbol: symbol
    },
    orderBy: {
      date: 'asc'
    }
  })

  let totalQuantity = 0
  let totalCost = 0

  for (const transaction of transactions) {
    if (['BUY'].includes(transaction.type)) {
      totalQuantity += transaction.quantity
      totalCost += transaction.quantity * transaction.price + transaction.fees
    }
  }

  if (totalQuantity > 0) {
    const avgPrice = totalCost / totalQuantity

    await prisma.holding.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolioId,
          symbol: symbol
        }
      },
      update: {
        quantity: totalQuantity,
        avgPrice: avgPrice
      },
      create: {
        portfolioId: portfolioId,
        symbol: symbol,
        quantity: totalQuantity,
        avgPrice: avgPrice,
        currency: 'USD'
      }
    })
  }
}

// Add the recalculateCashHoldings function here for testing
async function recalculateCashHoldings(portfolioId, portfolioCurrency) {
  const cashSymbol = `CASH_${portfolioCurrency}`
  
  console.log(`🔍 Starting cash recalculation for ${cashSymbol}`)
  
  const allTransactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId
    },
    orderBy: {
      date: 'asc'
    }
  })
  
  console.log(`📊 Processing ${allTransactions.length} transactions`)
  
  let runningCashBalance = 0
  
  for (const transaction of allTransactions) {
    const amount = transaction.quantity * transaction.price
    const fees = transaction.fees || 0
    
    let cashImpact = 0
    
    if (transaction.symbol.startsWith('CASH_')) {
      switch (transaction.type) {
        case 'DEPOSIT':
        case 'DIVIDEND':
          cashImpact = amount - fees
          break
        case 'SALDO_ADJUSTMENT':
          cashImpact = amount - fees
          break
      }
    } else {
      switch (transaction.type) {
        case 'BUY':
          cashImpact = -(amount + fees)
          break
        case 'DIVIDEND':
          cashImpact = amount - fees
          break
      }
    }
    
    runningCashBalance += cashImpact
    console.log(`🔄 ${transaction.type} ${transaction.symbol}: impact=${cashImpact}, running=${runningCashBalance}, saldo=${transaction.saldo || 'N/A'}`)
  }
  
  console.log(`🎯 Final calculated cash balance: ${runningCashBalance} ${portfolioCurrency}`)
  
  // Check for saldo validation
  const latestTransactionWithSaldo = await prisma.transaction.findFirst({
    where: {
      portfolioId: portfolioId,
      saldo: { not: null }
    },
    orderBy: {
      date: 'desc'
    }
  })
  
  if (latestTransactionWithSaldo?.saldo !== null && latestTransactionWithSaldo?.saldo !== undefined) {
    const brokerSaldo = latestTransactionWithSaldo.saldo
    const discrepancy = runningCashBalance - brokerSaldo
    
    console.log(`📊 Saldo validation: calculated=${runningCashBalance}, broker=${brokerSaldo}, discrepancy=${discrepancy}`)
    
    if (Math.abs(discrepancy) > 0.01) {
      console.log(`⚠️  Saldo discrepancy detected: ${discrepancy} ${portfolioCurrency}. Creating adjustment transaction.`)
      
      await prisma.transaction.create({
        data: {
          portfolioId: portfolioId,
          symbol: cashSymbol,
          type: 'SALDO_ADJUSTMENT',
          quantity: -discrepancy,
          price: 1.0,
          fees: 0,
          currency: portfolioCurrency,
          date: new Date(latestTransactionWithSaldo.date.getTime() + 1000),
          notes: `Automatic adjustment to match broker saldo (${brokerSaldo}). Corrected discrepancy of ${discrepancy}.`,
          saldo: brokerSaldo
        }
      })
      
      runningCashBalance = brokerSaldo
      console.log(`✅ Created saldo adjustment. New balance: ${runningCashBalance} ${portfolioCurrency}`)
    }
  }
  
  // Update cash holding
  await prisma.holding.upsert({
    where: {
      portfolioId_symbol: {
        portfolioId,
        symbol: cashSymbol
      }
    },
    update: {
      quantity: runningCashBalance,
      avgPrice: 1.0,
      currency: portfolioCurrency
    },
    create: {
      portfolioId,
      symbol: cashSymbol,
      quantity: runningCashBalance,
      avgPrice: 1.0,
      currency: portfolioCurrency
    }
  })
  
  console.log(`💰 Updated cash holding: ${runningCashBalance} ${portfolioCurrency}`)
}

testCSVSaldoImport()

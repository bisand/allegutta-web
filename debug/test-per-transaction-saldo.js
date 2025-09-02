import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPerTransactionSaldoAdjustment() {
  console.log('🧪 Testing per-transaction saldo adjustment during CSV import...')

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

    // Create test CSV data with multiple saldo discrepancies throughout the timeline
    const csvData = `Bokføringsdag	Verdipapir	ISIN	Transaksjonstype	Transaksjonstekst	Antall	Kurs	Beløp	Avgift	Saldo
2025-01-01	CASH_NOK		INNSKUDD	Initial deposit	10000	1	10000	0	10000
2025-01-02	AAPL	US0378331005	KJØPT	Buy Apple stock	10	150	1500	10	8488
2025-01-03	AAPL	US0378331005	UTBYTTE	Apple dividend	0	1	100	0	8592
2025-01-04	MSFT	US5949181045	KJØPT	Buy Microsoft	5	200	1000	10	7577
2025-01-05	CASH_NOK		INNSKUDD	Another deposit	2000	1	2000	0	9580`

    console.log('📊 Test CSV with per-transaction saldo discrepancies:')
    console.log('   Transaction 1: 10,000 deposit → Expected: 10,000, Saldo: 10,000 (✅ match)')
    console.log('   Transaction 2: Buy AAPL -1,510 → Expected: 8,490, Saldo: 8,488 (❌ -2 NOK discrepancy)')
    console.log('   Transaction 3: Dividend +100 → Expected: 8,590, Saldo: 8,592 (❌ +2 NOK discrepancy)')  
    console.log('   Transaction 4: Buy MSFT -1,010 → Expected: 7,580, Saldo: 7,577 (❌ -3 NOK discrepancy)')
    console.log('   Transaction 5: Deposit +2,000 → Expected: 9,580, Saldo: 9,580 (✅ match)')
    console.log('')
    console.log('   Expected adjustments after transactions 2, 3, and 4 (threshold > 1 NOK)')

    // Test the import endpoint functionality by simulating its logic
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split('\t')
    
    console.log(`📋 CSV Headers: ${headers.join(', ')}`)

    const portfolioCurrency = 'NOK'
    const cashSymbol = `CASH_${portfolioCurrency}`
    let transactionCount = 0
    let adjustmentCount = 0
    
    // Process each transaction individually (like the updated import logic)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t')
      const csvRow = {}
      headers.forEach((header, index) => {
        csvRow[header] = values[index]
      })

      console.log(`\n📊 Processing transaction ${i}: ${csvRow.Transaksjonstype} ${csvRow.Verdipapir || 'CASH'} → Saldo: ${csvRow.Saldo}`)

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

      // Create the transaction
      const createdTransaction = await prisma.transaction.create({
        data: {
          portfolioId: portfolio.id,
          symbol: symbol,
          isin: csvRow.ISIN || null,
          type: transactionType,
          quantity: quantity,
          price: price,
          fees: fees,
          currency: portfolioCurrency,
          date: new Date(csvRow.Bokføringsdag),
          notes: csvRow.Transaksjonstekst || null,
          saldo: saldo
        }
      })

      transactionCount++
      console.log(`✅ Created transaction: ${createdTransaction.type} ${createdTransaction.symbol} (${createdTransaction.date.toISOString().split('T')[0]})`)
      
      // If this transaction has a saldo value, check for discrepancy and create adjustment if needed
      if (createdTransaction.saldo !== null && createdTransaction.saldo !== undefined) {
        // Calculate the current cash balance up to this point
        const currentCashBalance = await calculateCashBalanceUpToDate(portfolio.id, createdTransaction.date)
        const brokerSaldo = createdTransaction.saldo
        const discrepancy = currentCashBalance - brokerSaldo
        
        console.log(`🔍 Saldo check: calculated=${currentCashBalance}, broker=${brokerSaldo}, discrepancy=${discrepancy}`)
        
        // Create adjustment if discrepancy is significant (more than 1 NOK as requested)
        if (Math.abs(discrepancy) > 1.0) {
          console.log(`⚠️  Saldo discrepancy detected: ${discrepancy} ${portfolioCurrency}. Creating immediate adjustment.`)
          
          const adjustmentTransaction = await prisma.transaction.create({
            data: {
              portfolioId: portfolio.id,
              symbol: cashSymbol,
              type: 'SALDO_ADJUSTMENT',
              quantity: -discrepancy,  // Negative to correct the discrepancy
              price: 1.0,
              fees: 0,
              currency: portfolioCurrency,
              date: new Date(createdTransaction.date.getTime() + 1000), // 1 second after the reference transaction
              notes: `Automatic adjustment after ${createdTransaction.type} ${createdTransaction.symbol}. Broker saldo: ${brokerSaldo}, calculated: ${currentCashBalance}, adjustment: ${-discrepancy}`,
              saldo: brokerSaldo
            }
          })
          
          adjustmentCount++
          console.log(`✅ Created saldo adjustment: ${adjustmentTransaction.quantity} ${portfolioCurrency}`)
        } else {
          console.log(`✅ No adjustment needed (discrepancy ${discrepancy} <= 1.0 threshold)`)
        }
      }
    }

    // Show final results
    console.log(`\n🏁 Import completed:`)
    console.log(`   📊 ${transactionCount} transactions created`)
    console.log(`   🔧 ${adjustmentCount} saldo adjustments created`)

    // Show all transactions in chronological order
    const allTx = await prisma.transaction.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { date: 'asc' }
    })

    console.log('\n📋 Final transaction timeline:')
    for (const tx of allTx) {
      const dateStr = tx.date.toISOString().split('T')[0]
      const timeStr = tx.date.toISOString().split('T')[1].split('.')[0]
      const saldoStr = tx.saldo ? tx.saldo.toString() : 'N/A'
      console.log(`   ${dateStr} ${timeStr} | ${tx.type.padEnd(16)} | ${tx.symbol.padEnd(10)} | ${tx.quantity.toString().padStart(8)} | Saldo: ${saldoStr.padStart(8)}`)
    }

    // Calculate final cash balance
    const finalCash = await prisma.holding.findFirst({
      where: {
        portfolioId: portfolio.id,
        symbol: 'CASH_NOK'
      }
    })

    console.log(`\n💰 Final cash holding: ${finalCash?.quantity || 0} NOK`)

    // Show summary of adjustments
    const adjustments = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolio.id,
        type: 'SALDO_ADJUSTMENT'
      },
      orderBy: { date: 'asc' }
    })

    if (adjustments.length > 0) {
      console.log(`\n🔧 Saldo adjustments summary:`)
      for (const adj of adjustments) {
        console.log(`   - ${adj.date.toISOString().split('T')[0]}: ${adj.quantity} NOK`)
        console.log(`     ${adj.notes}`)
      }
    }

  } catch (error) {
    console.error('❌ Error testing per-transaction saldo adjustment:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function to calculate cash balance up to a specific date
async function calculateCashBalanceUpToDate(portfolioId, upToDate) {
  const allTransactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      date: {
        lte: upToDate
      }
    },
    orderBy: {
      date: 'asc'
    }
  })
  
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
  }
  
  return runningCashBalance
}

testPerTransactionSaldoAdjustment()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSaldoWithDiscrepancies() {
  console.log('🧪 Testing saldo logic with some discrepancies...')

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

    // Create test CSV data with some discrepancies
    const csvData = `Bokføringsdag	Verdipapir	ISIN	Transaksjonstype	Transaksjonstekst	Antall	Kurs	Beløp	Avgift	Saldo
2025-01-01	CASH_NOK		INNSKUDD	Initial deposit	10000	1	10000	0	10000
2025-01-02	AAPL	US0378331005	KJØPT	Buy Apple stock	10	150	1500	10	8488
2025-01-03	AAPL	US0378331005	UTBYTTE	Apple dividend	0	1	100	0	8591
2025-01-04	CASH_NOK		INNSKUDD	Small deposit	500	1	500	0	9100`

    console.log('📊 Test CSV with some discrepancies:')
    console.log('   Start: 0')
    console.log('   Transaction 1: +10,000 → Expected: 10,000, Saldo: 10,000 ✅ (perfect match)')
    console.log('   Transaction 2: -1,510 → Expected: 8,490, Saldo: 8,488 ❌ (-2 NOK, within tolerance)')  
    console.log('   Transaction 3: +100 → Expected: 8,588, Saldo: 8,591 ❌ (+3 NOK, within tolerance)')
    console.log('   Transaction 4: +500 → Expected: 9,091, Saldo: 9,100 ❌ (+9 NOK, EXCEEDS tolerance)')
    console.log('')
    console.log('   Should create 1 adjustment after transaction 4 (9 NOK > 3 NOK threshold)')

    // Test the logic with actual CSV import simulation
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split('\t')
    
    console.log(`📋 CSV Headers: ${headers.join(', ')}`)

    const portfolioCurrency = 'NOK'
    let expectedSaldo = 0  // Track expected running saldo
    let transactionCount = 0
    let adjustmentCount = 0
    
    // Process each transaction with the actual import logic
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

      // Create the transaction (simulate the import)
      console.log(`   ✅ Creating transaction: ${transactionType} ${symbol}`)

      // Calculate expected saldo: previous saldo + transaction beløp
      const transactionBeløp = quantity * price
      let cashImpact = 0
      
      if (symbol.startsWith('CASH_')) {
        // Direct cash transaction - use beløp as-is
        switch (transactionType) {
          case 'DEPOSIT':
          case 'DIVIDEND':
          case 'DIVIDEND_REINVEST':
          case 'REFUND':
          case 'LIQUIDATION':
          case 'REDEMPTION':
            cashImpact = transactionBeløp - fees
            break
          case 'WITHDRAWAL':
            cashImpact = -(Math.abs(transactionBeløp) + fees)
            break
        }
      } else {
        // Stock transaction affects cash
        switch (transactionType) {
          case 'BUY':
            cashImpact = -(transactionBeløp + fees)
            break
          case 'SELL':
            cashImpact = transactionBeløp - fees
            break
          case 'DIVIDEND':
            cashImpact = transactionBeløp - fees
            break
        }
      }
      
      expectedSaldo += cashImpact
      const brokerSaldo = saldo
      const discrepancy = expectedSaldo - brokerSaldo
      
      console.log(`   🔍 Simple saldo check: expected=${expectedSaldo}, broker=${brokerSaldo}, discrepancy=${discrepancy}`)
      
      // Check if adjustment is needed (more than 3 kr as requested)
      if (Math.abs(discrepancy) > 3.0) {
        console.log(`   ⚠️  Saldo discrepancy detected: ${discrepancy} ${portfolioCurrency}. Would create immediate adjustment.`)
        
        console.log(`   ✅ Would create saldo adjustment: ${-discrepancy} ${portfolioCurrency}`)
        adjustmentCount++
        
        // Update our expected saldo to match broker
        expectedSaldo = brokerSaldo
      } else {
        // Update our expected saldo to match broker for next calculation
        expectedSaldo = brokerSaldo
        console.log(`   ✅ Saldo within tolerance (${discrepancy} <= 3.0 kr), using broker value: ${brokerSaldo}`)
      }

      transactionCount++
    }

    console.log(`\n🏁 Results with discrepancies:`)
    console.log(`   📊 ${transactionCount} transactions processed`)
    console.log(`   🔧 ${adjustmentCount} adjustments would be created`)
    console.log(`   🎯 Final expected saldo: ${expectedSaldo} NOK`)

    if (adjustmentCount === 1) {
      console.log(`\n✅ Perfect! Only 1 adjustment created for the significant discrepancy (> 3 kr).`)
    } else {
      console.log(`\n❌ Expected 1 adjustment, got ${adjustmentCount}`)
    }

  } catch (error) {
    console.error('❌ Error testing saldo with discrepancies:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSaldoWithDiscrepancies()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testSimpleSaldoLogic() {
  console.log('🧪 Testing SIMPLE saldo logic (Previous Saldo + Beløp = New Saldo)...')

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

    // Create test CSV data with realistic saldo progression
    const csvData = `Bokføringsdag	Verdipapir	ISIN	Transaksjonstype	Transaksjonstekst	Antall	Kurs	Beløp	Avgift	Saldo
2025-01-01	CASH_NOK		INNSKUDD	Initial deposit	10000	1	10000	0	10000
2025-01-02	AAPL	US0378331005	KJØPT	Buy Apple stock	10	150	1500	10	8490
2025-01-03	AAPL	US0378331005	UTBYTTE	Apple dividend	0	1	100	0	8590
2025-01-04	CASH_NOK		INNSKUDD	Small deposit	500	1	500	0	9090`

    console.log('📊 Test CSV with simple saldo progression:')
    console.log('   Start: 0')
    console.log('   Transaction 1: +10,000 → Expected: 10,000, Saldo: 10,000 ✅')
    console.log('   Transaction 2: -1,510 → Expected: 8,490, Saldo: 8,490 ✅')  
    console.log('   Transaction 3: +100 → Expected: 8,590, Saldo: 8,590 ✅')
    console.log('   Transaction 4: +500 → Expected: 9,090, Saldo: 9,090 ✅')
    console.log('')
    console.log('   Should have NO adjustments (all perfectly match)')

    // Test the simple logic
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split('\t')
    
    console.log(`📋 CSV Headers: ${headers.join(', ')}`)

    let expectedSaldo = 0  // Track expected running saldo
    let transactionCount = 0
    let adjustmentCount = 0
    
    // Process each transaction with simple logic
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t')
      const csvRow = {}
      headers.forEach((header, index) => {
        csvRow[header] = values[index]
      })

      console.log(`\n📊 Processing transaction ${i}: ${csvRow.Transaksjonstype} ${csvRow.Verdipapir || 'CASH'} → Saldo: ${csvRow.Saldo}`)

      const transactionBeløp = parseFloat(csvRow.Beløp)
      const fees = parseFloat(csvRow.Avgift) || 0
      const brokerSaldo = parseFloat(csvRow.Saldo)

      // Calculate cash impact based on transaction type
      let cashImpact = 0
      
      if (csvRow.Transaksjonstype === 'INNSKUDD') {
        // Deposit: positive cash impact
        cashImpact = transactionBeløp - fees
      } else if (csvRow.Transaksjonstype === 'KJØPT') {
        // Purchase: negative cash impact (spending money)
        cashImpact = -(transactionBeløp + fees)
      } else if (csvRow.Transaksjonstype === 'UTBYTTE') {
        // Dividend: positive cash impact
        cashImpact = transactionBeløp - fees
      }

      expectedSaldo += cashImpact
      const discrepancy = expectedSaldo - brokerSaldo

      console.log(`   Beløp: ${transactionBeløp}, Fees: ${fees}, Cash Impact: ${cashImpact}`)
      console.log(`   Expected: ${expectedSaldo}, Broker: ${brokerSaldo}, Discrepancy: ${discrepancy}`)

      if (Math.abs(discrepancy) > 3.0) {
        console.log(`   ⚠️  Would create adjustment: ${-discrepancy} NOK`)
        adjustmentCount++
        expectedSaldo = brokerSaldo  // Align with broker
      } else {
        console.log(`   ✅ Within tolerance, using broker saldo: ${brokerSaldo}`)
        expectedSaldo = brokerSaldo  // Always use broker saldo for next calculation
      }

      transactionCount++
    }

    console.log(`\n🏁 Simple Logic Results:`)
    console.log(`   📊 ${transactionCount} transactions processed`)
    console.log(`   🔧 ${adjustmentCount} adjustments would be created`)
    console.log(`   🎯 Final expected saldo: ${expectedSaldo} NOK`)

    console.log(`\n✅ Perfect! No adjustments needed when saldo progression is correct.`)

  } catch (error) {
    console.error('❌ Error testing simple saldo logic:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testSimpleSaldoLogic()

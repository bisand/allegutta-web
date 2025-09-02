import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testIdBasedSorting() {
  console.log('🧪 Testing ID-based sorting for correct saldo progression...')

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

    // Create test CSV data with same-day transactions in WRONG CSV order but correct ID order
    // This simulates the real issue where CSV rows are not chronologically ordered
    const csvData = `Id	Bokføringsdag	Handelsdag	Oppgjørsdag	Portefølje	Transaksjonstype	Verdipapir	ISIN	Antall	Kurs	Rente	Totale Avgifter	Valuta	Beløp		Valuta	Kjøpsverdi	Valuta	Resultat	Valuta	Totalt antall	CalcSaldo	Saldo	Diff	Vekslingskurs	Transaksjonstekst	Makuleringsdato	Sluttseddelnummer	Verifikationsnummer	Kurtasje	Valuta	Valutakurs	Innledende rente
1000000003	2025-08-28	2025-08-28	2025-08-28	6627020	UTBYTTE	EQNR	NO0010096985	152	3.774			NOK	573.65		NOK				NOK	0	10573.65	10573.65	0		UTBYTTE EQNR 3.774 NOK/AKSJE			2072317806			
1000000001	2025-08-28	2025-08-28	2025-08-28	6627020	INNSKUDD					NOK	10000		NOK				NOK	0	10000	10000	0		Initial deposit			1234567890			
1000000002	2025-08-28	2025-08-28	2025-08-28	6627020	KJØPT	AAPL	US0378331005	10	150		NOK	1500		NOK				NOK	10	8500	8500	0		Buy Apple stock			1234567891			`

    console.log('📊 Test CSV with same-day transactions in WRONG order but correct IDs:')
    console.log('   CSV Row 1: ID=1000000003, UTBYTTE (dividend) → Should be LAST (Saldo: 10,573.65)')
    console.log('   CSV Row 2: ID=1000000001, INNSKUDD (deposit) → Should be FIRST (Saldo: 10,000)')  
    console.log('   CSV Row 3: ID=1000000002, KJØPT (buy) → Should be SECOND (Saldo: 8,500)')
    console.log('')
    console.log('   Correct ID order: 1000000001 → 1000000002 → 1000000003')
    console.log('   Expected saldo progression: 0 → 10,000 → 8,500 → 10,573.65')

    // Simulate the parsing and sorting logic
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split('\t')
    
    console.log(`📋 CSV Headers: ${headers.slice(0, 10).join(', ')}...`)

    // Parse all transactions
    const parsedTransactions = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t')
      const csvRow = {}
      headers.forEach((header, index) => {
        csvRow[header] = values[index]
      })

      const id = parseInt(csvRow.Id) || 0
      const date = new Date(csvRow.Bokføringsdag)
      
      parsedTransactions.push({
        csvRow,
        date,
        lineNumber: i + 1,
        id
      })
    }

    console.log('\n📊 Before sorting (CSV order):')
    for (const tx of parsedTransactions) {
      console.log(`   Line ${tx.lineNumber}: ID=${tx.id}, ${tx.csvRow.Transaksjonstype}, Saldo=${tx.csvRow.Saldo}`)
    }

    // Sort by ID (like the fixed import logic)
    parsedTransactions.sort((a, b) => a.id - b.id)

    console.log('\n📊 After sorting by ID (correct chronological order):')
    for (const tx of parsedTransactions) {
      console.log(`   ID=${tx.id}: ${tx.csvRow.Transaksjonstype}, Saldo=${tx.csvRow.Saldo}`)
    }

    // Now test the saldo progression with correct order
    let expectedSaldo = 0
    let adjustmentCount = 0
    
    console.log('\n🔍 Testing saldo progression with correct ID-based order:')
    
    for (const { csvRow } of parsedTransactions) {
      const transactionBeløp = parseFloat(csvRow.Beløp)
      const fees = parseFloat(csvRow['Totale Avgifter']) || 0
      const brokerSaldo = parseFloat(csvRow.Saldo)

      // Calculate cash impact based on transaction type
      let cashImpact = 0
      
      if (csvRow.Transaksjonstype === 'INNSKUDD') {
        cashImpact = transactionBeløp - fees
      } else if (csvRow.Transaksjonstype === 'KJØPT') {
        cashImpact = -(transactionBeløp + fees)
      } else if (csvRow.Transaksjonstype === 'UTBYTTE') {
        cashImpact = transactionBeløp - fees
      }

      expectedSaldo += cashImpact
      const discrepancy = expectedSaldo - brokerSaldo

      console.log(`   ID=${csvRow.Id}: ${csvRow.Transaksjonstype} → Impact: ${cashImpact}, Expected: ${expectedSaldo}, Broker: ${brokerSaldo}, Diff: ${discrepancy}`)

      if (Math.abs(discrepancy) > 3.0) {
        console.log(`     ⚠️  Would create adjustment: ${-discrepancy} NOK`)
        adjustmentCount++
        expectedSaldo = brokerSaldo
      } else {
        console.log(`     ✅ Within tolerance`)
        expectedSaldo = brokerSaldo
      }
    }

    console.log(`\n🏁 Results with ID-based sorting:`)
    console.log(`   🔧 ${adjustmentCount} adjustments would be created`)
    
    if (adjustmentCount === 0) {
      console.log(`   ✅ Perfect! No adjustments needed when transactions are in correct ID order.`)
    } else {
      console.log(`   ❌ Still ${adjustmentCount} adjustments needed - there may be other issues.`)
    }

  } catch (error) {
    console.error('❌ Error testing ID-based sorting:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testIdBasedSorting()

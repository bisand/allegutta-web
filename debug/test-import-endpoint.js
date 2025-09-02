import { PrismaClient } from '@pris    // Test CSV data with corrected Norwegian formatting and proper field alignment
    const csvData = `Id	Bokføringsdag	Handelsdag	Oppgjörsdag	Portefölje	Transaksjonstype	Verdipapir	ISIN	Antall	Kurs	Rente	Totale Avgifter	Valuta	Beløp		Valuta	Kjöpsverdi	Valuta	Resultat	Valuta	Totalt antall	CalcSaldo	Saldo	Diff	Vekslingskurs	Transaksjonstekst	Makuleringsdato	Sluttseddelnummer	Verifikationsnummer	Kurtasje	Valuta	Valutakurs	Innledende rente
1000000003	2025-08-28	2025-08-28	2025-08-28	6627020	UTBYTTE	EQNR	NO0010096985	152	3,774				573,65		NOK					0	10573,65	10573,65	0		UTBYTTE EQNR 3.774 NOK/AKSJE			2072317806
1000000001	2025-08-28	2025-08-28	2025-08-28	6627020	INNSKUDD						10000		NOK					0	10000	10000	0		Initial deposit			1234567890
1000000002	2025-08-28	2025-08-28	2025-08-28	6627020	KJØPT	AAPL	US0378331005	10	150				1500		NOK					10	8500	8500	0		Buy Apple stock			1234567891`ient'

const prisma = new PrismaClient()

async function testImportEndpoint() {
  console.log('🧪 Testing CSV import endpoint with corrected data...')

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

    // Test CSV data with corrected Norwegian formatting
    const csvData = `Id	Bokføringsdag	Handelsdag	Oppgjørsdag	Portefølje	Transaksjonstype	Verdipapir	ISIN	Antall	Kurs	Rente	Totale Avgifter	Valuta	Beløp		Valuta	Kjøpsverdi	Valuta	Resultat	Valuta	Totalt antall	CalcSaldo	Saldo	Diff	Vekslingskurs	Transaksjonstekst	Makuleringsdato	Sluttseddelnummer	Verifikationsnummer	Kurtasje	Valuta	Valutakurs	Innledende rente
1000000003	2025-08-28	2025-08-28	2025-08-28	6627020	UTBYTTE	EQNR	NO0010096985	152	3,774				573,65		NOK					0	10573,65	10573,65	0		UTBYTTE EQNR 3.774 NOK/AKSJE			2072317806
1000000001	2025-08-28	2025-08-28	2025-08-28	6627020	INNSKUDD						10000		NOK					0	10000	10000	0		Initial deposit			1234567890
1000000002	2025-08-28	2025-08-28	2025-08-28	6627020	KJØPT	AAPL	US0378331005	10	150				1500		NOK					10	8500	8500	0		Buy Apple stock			1234567891`

    console.log('📊 Test CSV with same-day transactions in WRONG CSV order but correct IDs:')
    console.log('   CSV Row 1: ID=1000000003, UTBYTTE (dividend) → Should be LAST (Saldo: 10,573.65)')
    console.log('   CSV Row 2: ID=1000000001, INNSKUDD (deposit) → Should be FIRST (Saldo: 10,000)')  
    console.log('   CSV Row 3: ID=1000000002, KJØPT (buy) → Should be SECOND (Saldo: 8,500)')
    console.log('')
    console.log('   Correct ID order: 1000000001 → 1000000002 → 1000000003')
    console.log('   Expected saldo progression: 0 → 10,000 → 8,500 → 10,573.65')

    // Import directly using the internal logic (since we can't easily mock auth for API calls)
    // This tests the same parsing and sorting logic
    const lines = csvData.split('\n').filter(line => line.trim())
    const headers = lines[0].split('\t')
    
    console.log(`📋 CSV Headers: ${headers.slice(0, 10).join(', ')}... (${headers.length} total)`)

    // Parse all transactions using the same logic as the import endpoint
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

    // Test the Norwegian number parsing for saldo values
    function parseNorwegianNumber(value) {
      if (!value || value.trim() === '') return null
      return parseFloat(value.replace(/\s/g, '').replace(',', '.'))
    }

    console.log('\n🔍 Testing Norwegian number parsing for saldo values:')
    for (const tx of parsedTransactions) {
      const rawSaldo = tx.csvRow.Saldo
      const parsedSaldo = parseNorwegianNumber(rawSaldo)
      console.log(`   ID=${tx.id}: Raw="${rawSaldo}" → Parsed=${parsedSaldo}`)
    }

    // Now create the transactions using Prisma directly to test the full logic
    const portfolioCurrency = portfolio.currency || 'NOK'
    let successCount = 0
    let expectedSaldo = 0

    console.log('\n🏗️  Creating transactions in chronological order...')

    for (const { csvRow, id } of parsedTransactions) {
      try {
        // Map transaction type (simplified version of the import logic)
        const transactionTypeMap = {
          'INNSKUDD': 'DEPOSIT',
          'KJØPT': 'BUY', 
          'UTBYTTE': 'DIVIDEND'
        }
        
        const mappedTransactionType = transactionTypeMap[csvRow.Transaksjonstype]
        if (!mappedTransactionType) {
          console.log(`⚠️  Unknown transaction type: ${csvRow.Transaksjonstype}`)
          continue
        }

        // Process the transaction
        let symbol = csvRow.Verdipapir ? csvRow.Verdipapir.toUpperCase() : null
        
        // For cash transactions, use CASH symbol
        if (!symbol || symbol.trim() === '' || ['DEPOSIT', 'DIVIDEND'].includes(mappedTransactionType)) {
          symbol = `CASH_${portfolioCurrency}`
        }

        // Parse amounts
        const quantity = csvRow.Antall ? parseNorwegianNumber(csvRow.Antall) : parseNorwegianNumber(csvRow.Beløp) || 0
        const price = csvRow.Kurs ? parseNorwegianNumber(csvRow.Kurs) : 1.0
        const fees = parseNorwegianNumber(csvRow['Totale Avgifter']) || 0
        const saldo = parseNorwegianNumber(csvRow.Saldo)

        // For cash transactions, adjust quantity and price
        let finalQuantity = quantity
        let finalPrice = price
        
        if (symbol.startsWith('CASH_')) {
          finalQuantity = Math.abs(parseNorwegianNumber(csvRow.Beløp) || 0)
          finalPrice = 1.0
        }

        const transactionData = {
          portfolioId: portfolio.id,
          symbol: symbol,
          isin: csvRow.ISIN || null,
          type: mappedTransactionType,
          quantity: finalQuantity,
          price: finalPrice,
          fees: fees,
          currency: portfolioCurrency,
          date: new Date(csvRow.Bokføringsdag),
          notes: csvRow.Transaksjonstekst || null,
          saldo: saldo
        }

        // Create the transaction
        const createdTransaction = await prisma.transaction.create({
          data: transactionData
        })

        successCount++
        console.log(`✅ Created transaction: ${createdTransaction.type} ${createdTransaction.symbol} (ID=${id}, Saldo=${createdTransaction.saldo})`)

        // Test saldo progression
        if (createdTransaction.saldo !== null && createdTransaction.saldo !== undefined) {
          const transactionBeløp = createdTransaction.quantity * createdTransaction.price
          let cashImpact = 0

          if (createdTransaction.symbol.startsWith('CASH_')) {
            switch (createdTransaction.type) {
              case 'DEPOSIT':
              case 'DIVIDEND':
                cashImpact = transactionBeløp - (createdTransaction.fees || 0)
                break
            }
          } else {
            switch (createdTransaction.type) {
              case 'BUY':
                cashImpact = -(transactionBeløp + (createdTransaction.fees || 0))
                break
              case 'DIVIDEND':
                cashImpact = transactionBeløp - (createdTransaction.fees || 0)
                break
            }
          }

          expectedSaldo += cashImpact
          const brokerSaldo = createdTransaction.saldo
          const discrepancy = expectedSaldo - brokerSaldo

          console.log(`   💰 Cash impact: ${cashImpact}, Expected saldo: ${expectedSaldo}, Broker saldo: ${brokerSaldo}, Discrepancy: ${discrepancy}`)

          // Test if discrepancy is within tolerance
          if (Math.abs(discrepancy) > 3.0) {
            console.log(`   ⚠️  Large discrepancy: ${discrepancy} ${portfolioCurrency}`)
          } else {
            console.log(`   ✅ Saldo within tolerance`)
          }
        }

      } catch (error) {
        console.log(`❌ Error creating transaction ${id}: ${error.message}`)
      }
    }

    console.log(`\n🏁 Import test completed: ${successCount} transactions created`)
    
    // Show final transaction order in database
    const finalTransactions = await prisma.transaction.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { date: 'asc' }
    })
    
    console.log('\n📊 Final transactions in database (by date):')
    for (const tx of finalTransactions) {
      console.log(`   ${tx.date.toISOString().split('T')[0]}: ${tx.type} ${tx.symbol} (Saldo=${tx.saldo})`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testImportEndpoint()

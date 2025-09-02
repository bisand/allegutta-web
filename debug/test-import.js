import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testImport() {
  console.log('🧪 Testing CSV import with corrected saldo parsing...')

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

    // Simple CSV with well-formed data
    const csvData = [
      'Id\tBokføringsdag\tHandelsdag\tOppgjørsdag\tPortefølje\tTransaksjonstype\tVerdipapir\tISIN\tAntall\tKurs\tRente\tTotale Avgifter\tValuta\tBeløp\t\tValuta\tKjøpsverdi\tValuta\tResultat\tValuta\tTotalt antall\tCalcSaldo\tSaldo\tDiff\tVekslingskurs\tTransaksjonstekst\tMakuleringsdato\tSlutt seddelnummer\tVerifikationsnummer\tKurtasje\tValuta\tValutakurs\tInnledende rente',
      '1000000003\t2025-08-28\t2025-08-28\t2025-08-28\t6627020\tUTBYTTE\tEQNR\tNO0010096985\t152\t3.774\t\t\tNOK\t573.65\t\tNOK\t\t\tNOK\t\tNOK\t0\t10573.65\t10573.65\t0\t\tUTBYTTE EQNR 3.774 NOK/AKSJE\t\t\t2072317806\t\t\tNOK\t\t',
      '1000000001\t2025-08-28\t2025-08-28\t2025-08-28\t6627020\tINNSKUDD\t\t\t\t\t\t\tNOK\t10000\t\tNOK\t\t\tNOK\t\tNOK\t0\t10000\t10000\t0\t\tInitial deposit\t\t\t1234567890\t\t\tNOK\t\t',
      '1000000002\t2025-08-28\t2025-08-28\t2025-08-28\t6627020\tKJØPT\tAAPL\tUS0378331005\t10\t150\t\t\tNOK\t1500\t\tNOK\t\t\tNOK\t\tNOK\t10\t8500\t8500\t0\t\tBuy Apple stock\t\t\t1234567891\t\t\tNOK\t\t'
    ].join('\n')

    console.log('📊 Test CSV with correct saldo values:')
    console.log('   CSV Row 1: ID=1000000003, UTBYTTE (dividend) → Should be LAST (Saldo: 10573.65)')
    console.log('   CSV Row 2: ID=1000000001, INNSKUDD (deposit) → Should be FIRST (Saldo: 10000)')  
    console.log('   CSV Row 3: ID=1000000002, KJØPT (buy) → Should be SECOND (Saldo: 8500)')
    console.log('')
    console.log('   Correct ID order: 1000000001 → 1000000002 → 1000000003')
    console.log('   Expected saldo progression: 0 → 10000 → 8500 → 10573.65')

    // Test CSV parsing
    const lines = csvData.split('\n')
    const headers = lines[0].split('\t')
    console.log(`📋 CSV Headers (${headers.length}):`, headers.slice(0, 10).join(', '), '...')
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\t')
      const csvRow = {}
      headers.forEach((header, index) => {
        csvRow[header] = values[index] || ''
      })
      console.log(`📊 Row ${i}: ID=${csvRow.Id}, Type=${csvRow.Transaksjonstype}, Saldo=${csvRow.Saldo}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testImport()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testImportEndpoint() {
  console.log('🧪 Testing REAL CSV import endpoint...')

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

    // Clear existing transactions and holdings
    await prisma.transaction.deleteMany({
      where: { portfolioId: portfolio.id }
    })
    await prisma.holding.deleteMany({
      where: { portfolioId: portfolio.id }
    })
    console.log('🧹 Cleared existing transactions and holdings')

    // Generate test CSV with proper Norwegian formatting
    const csvData = `Id	Bokføringsdag	Handelsdag	Oppgjörsdag	Portefölje	Transaksjonstype	Verdipapir	ISIN	Antall	Kurs	Rente	Totale Avgifter	Valuta	Beløp		Valuta	Kjöpsverdi	Valuta	Resultat	Valuta	Totalt antall	CalcSaldo	Saldo	Diff	Vekslingskurs	Transaksjonstekst	Makuleringsdato	Sluttseddelnummer	Verifikationsnummer	Kurtasje	Valuta	Valutakurs	Innledende rente
1000000003	2025-09-02	2025-09-02	2025-09-02	6627020	UTBYTTE	EQNR	NO0010096985	152	3,774				573,65		NOK					0		10573,65		UTBYTTE EQNR 3.774 NOK/AKSJE			2072317806				
1000000001	2025-09-02	2025-09-02	2025-09-02	6627020	INNSKUDD						10000		NOK					0		10000		Initial deposit			1234567890				
1000000002	2025-09-02	2025-09-02	2025-09-02	6627020	KJØPT	AAPL	US0378331005	10	150				-1500		NOK					10		8500		Buy Apple stock			1234567891				`

    console.log('📊 Generated test CSV data')

    // Now we need to simulate the import endpoint call
    // Since we can't easily make HTTP calls in this context, let's call the import logic directly
    console.log('🔄 Simulating import endpoint call...')

    // Import the import logic (this would normally be an HTTP call)
    const { default: importHandler } = await import('./server/api/portfolios/[id]/transactions/import.post.ts')
    
    // Create a mock event object
    const mockEvent = {
      node: {
        req: {
          method: 'POST'
        }
      },
      context: {
        params: {
          id: portfolio.id
        }
      }
    }

    // Mock the required functions
    global.getMethod = () => 'POST'
    global.requireAuth = async () => ({ id: portfolio.userId })
    global.getRouterParam = (event, param) => portfolio.id
    global.readBody = async () => ({ csvData })
    global.createError = (options) => new Error(options.statusMessage)
    global.defineEventHandler = (handler) => handler

    try {
      const result = await importHandler(mockEvent)
      console.log('✅ Import completed:', result.message)

      // Check the holdings after import
      const holdings = await prisma.holding.findMany({
        where: { portfolioId: portfolio.id }
      })

      console.log('💰 Holdings after import:')
      holdings.forEach(h => {
        console.log(`   ${h.symbol}: ${h.quantity} @ ${h.avgPrice} = ${h.quantity * h.avgPrice}`)
      })

      const cashHolding = holdings.find(h => h.symbol === 'CASH_NOK')
      if (cashHolding) {
        console.log(`🔍 CASH_NOK holding: ${cashHolding.quantity}`)
        console.log(`🔍 Expected from last saldo: 10573.65`)
        console.log(`🔍 Match: ${Math.abs(cashHolding.quantity - 10573.65) < 0.01 ? '✅' : '❌'}`)
      } else {
        console.log('❌ No CASH_NOK holding found')
      }

    } catch (importError) {
      console.error('❌ Import failed:', importError.message)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testImportEndpoint()

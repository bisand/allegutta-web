import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test the cash calculation directly
async function testCashCalculation() {
  console.log('🧪 Testing cash calculation directly...')

  try {
    // Get the test portfolio
    const portfolio = await prisma.portfolio.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!portfolio) {
      console.log('❌ No portfolio found')
      return
    }

    console.log(`📁 Using portfolio: ${portfolio.name} (${portfolio.id})`)

    // Get all transactions with saldo
    const transactionsWithSaldo = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolio.id,
        saldo: { not: null }
      },
      orderBy: { date: 'desc' }
    })

    console.log(`📊 Found ${transactionsWithSaldo.length} transactions with saldo:`)
    transactionsWithSaldo.forEach(t => {
      console.log(`   ${t.date.toISOString().split('T')[0]}: ${t.type} ${t.symbol} (Saldo: ${t.saldo})`)
    })

    if (transactionsWithSaldo.length > 0) {
      const latestSaldo = transactionsWithSaldo[0].saldo
      console.log(`🔍 Latest saldo (should be cash balance): ${latestSaldo}`)
    }

    // Check current holdings
    const holdings = await prisma.holding.findMany({
      where: { portfolioId: portfolio.id }
    })

    console.log(`💰 Current holdings:`)
    holdings.forEach(h => {
      console.log(`   ${h.symbol}: ${h.quantity}`)
      if (h.symbol === 'CASH_NOK') {
        console.log(`     ^^ This should be ${transactionsWithSaldo[0]?.saldo || 'unknown'}`)
      }
    })

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCashCalculation()

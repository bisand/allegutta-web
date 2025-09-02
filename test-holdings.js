import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function testHoldings() {
    try {
        console.log('🧪 Testing holdings calculation...')
        
        // Get the test portfolio
        const portfolio = await prisma.portfolio.findFirst({
            where: { name: 'My Portfolio' },
            orderBy: { createdAt: 'desc' }
        })
        
        if (!portfolio) {
            console.log('❌ No test portfolio found')
            return
        }
        
        console.log(`📁 Using portfolio: ${portfolio.name} (${portfolio.id})`)
        
        // Get transactions for this portfolio
        const transactions = await prisma.transaction.findMany({
            where: { portfolioId: portfolio.id },
            orderBy: { date: 'asc' }
        })
        
        console.log(`📊 Found ${transactions.length} transactions:`)
        transactions.forEach(t => {
            console.log(`   ${t.type} ${t.symbol} ${t.quantity} @ ${t.price} (amount: ${t.amount}) (${t.date.toISOString().split('T')[0]})`)
        })
        
        // Get holdings for this portfolio
        const holdings = await prisma.holding.findMany({
            where: { portfolioId: portfolio.id }
        })
        
        console.log(`💰 Found ${holdings.length} holdings:`)
        holdings.forEach(h => {
            console.log(`   ${h.symbol}: ${h.quantity} @ ${h.avgPrice} = ${h.quantity * h.avgPrice}`)
        })
        
        // Calculate expected cash using amount field from ALL transactions
        let expectedCashFromAmount = 0
        transactions.forEach(t => {
            if (t.amount !== null && t.amount !== undefined) {
                expectedCashFromAmount += t.amount
                console.log(`   Transaction ${t.type} amount: ${t.amount}, running total: ${expectedCashFromAmount}`)
            }
        })
        
        // Calculate expected cash manually (old way)
        let expectedCash = 0
        transactions.forEach(t => {
            if (t.symbol === 'CASH_NOK') {
                expectedCash += t.quantity
                console.log(`   Cash transaction: ${t.type} ${t.quantity}, running total: ${expectedCash}`)
            }
        })
        
        console.log(`🔍 Expected CASH_NOK (old way): ${expectedCash}`)
        console.log(`🔍 Expected CASH_NOK (amount field): ${expectedCashFromAmount}`)
        const actualCash = holdings.find(h => h.symbol === 'CASH_NOK')?.quantity || 0
        console.log(`🔍 Actual CASH_NOK: ${actualCash}`)
        console.log(`🔍 Difference: ${actualCash - expectedCashFromAmount}`)
        
    } catch (error) {
        console.error('❌ Test failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testHoldings()

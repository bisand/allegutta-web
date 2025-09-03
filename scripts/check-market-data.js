import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMarketData() {
  console.log('Checking market data in holdings...\n')
  
  try {
    // Get some holdings with market data
    const holdings = await prisma.$queryRaw`
      SELECT 
        symbol, 
        symbolYahoo, 
        currentPrice, 
        longName,
        shortName,
        regularMarketChangePercent,
        exchange,
        lastUpdated
      FROM holdings 
      WHERE symbolYahoo IS NOT NULL 
      AND currentPrice IS NOT NULL
      LIMIT 10
    `

    console.log(`Found ${holdings.length} holdings with market data:`)
    
    holdings.forEach(holding => {
      console.log(`\n${holding.symbol} (${holding.symbolYahoo}):`)
      console.log(`  Name: ${holding.shortName || holding.longName || 'N/A'}`)
      console.log(`  Price: $${holding.currentPrice}`)
      console.log(`  Change: ${holding.regularMarketChangePercent ? holding.regularMarketChangePercent.toFixed(2) + '%' : 'N/A'}`)
      console.log(`  Exchange: ${holding.exchange || 'N/A'}`)
      console.log(`  Updated: ${holding.lastUpdated}`)
    })
    
    // Get count of holdings with Yahoo symbols
    const totalWithSymbols = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM holdings WHERE symbolYahoo IS NOT NULL
    `
    
    console.log(`\nTotal holdings with Yahoo symbols: ${totalWithSymbols[0].count}`)
    
    // Get count of holdings with current prices
    const totalWithPrices = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM holdings WHERE currentPrice IS NOT NULL
    `
    
    console.log(`Total holdings with current prices: ${totalWithPrices[0].count}`)
    
  } catch (error) {
    console.error('Error checking market data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMarketData()

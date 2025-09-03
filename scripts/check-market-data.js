import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkMarketData() {
  console.log('Checking market data in holdings...\n')
  
  try {
    // Get some holdings with market data
    console.log('=== Market Data Overview ===')
    
    // Get holdings with their market data
    const holdings = await prisma.$queryRaw`
      SELECT 
        h.symbol,
        h.isin,
        h.quantity,
        h.avgPrice,
        md.symbolYahoo, 
        md.currentPrice, 
        md.longName,
        md.shortName,
        md.regularMarketChangePercent,
        md.exchange,
        md.lastUpdated
      FROM holdings h
      LEFT JOIN MarketData md ON h.isin = md.isin
      WHERE md.symbolYahoo IS NOT NULL 
      AND md.currentPrice IS NOT NULL
      LIMIT 10
    `

    console.log(`Found ${holdings.length} holdings with market data:`)
    
    holdings.forEach(holding => {
      console.log(`
📊 ${holding.symbol} (${holding.isin})`)
      console.log(`  Yahoo Symbol: ${holding.symbolYahoo}`)
      console.log(`  Holdings: ${holding.quantity} shares @ ${holding.avgPrice}`)
      console.log(`  Name: ${holding.shortName || holding.longName || 'N/A'}`)
      console.log(`  Price: $${holding.currentPrice}`)
      console.log(`  Change: ${holding.regularMarketChangePercent ? holding.regularMarketChangePercent.toFixed(2) + '%' : 'N/A'}`)
      console.log(`  Exchange: ${holding.exchange || 'N/A'}`)
      console.log(`  Updated: ${holding.lastUpdated}`)
    })
    
    // Get count of holdings with market data
    const totalWithSymbols = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM holdings h
      JOIN MarketData md ON h.isin = md.isin
      WHERE md.symbolYahoo IS NOT NULL
    `
    
    console.log(`\nTotal holdings with Yahoo symbols: ${totalWithSymbols[0].count}`)
    
    // Get count of market data entries with current prices
    const totalWithPrices = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM MarketData 
      WHERE currentPrice IS NOT NULL
    `
    
    const totalHoldings = await prisma.holding.count()
    const totalMarketData = await prisma.marketData.count()
    
    console.log(`Total holdings: ${totalHoldings}`)
    console.log(`Total market data entries: ${totalMarketData}`)
    console.log(`Market data with current prices: ${totalWithPrices[0].count}`)
    
  } catch (error) {
    console.error('Error checking market data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkMarketData()

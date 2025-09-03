import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function populateYahooSymbols() {
  console.log('Populating Yahoo symbols for Norwegian stocks...')
  
  // Simple mapping for known Norwegian stocks
  const knownMappings = {
    'NHY': 'NHY.OL',
    'TEL': 'TEL.OL', 
    'EQNR': 'EQNR.OL',
    'MOWI': 'MOWI.OL',
    'YAR': 'YAR.OL',
    'AKRBP': 'AKRBP.OL',
    'SALM': 'SALM.OL',
    'SCATC': 'SCATC.OL',
    'TGS': 'TGS.OL',
    'ACR': 'ACR.OL',
    'LSG': 'LSG.OL',
    'KOA': 'KOA.OL',
    'AFK': 'AFK.OL',
    'EPR': 'EPR.OL',
    'RANA': 'RANA.OL',
    'ELO': 'ELO.OL',
    'DNB': 'DNB.OL',
    'TOM': 'TOM.OL',
    'AKBM': 'AKBM.OL',
    'FRO': 'FRO.OL',
    'SNI': 'SNI.OL',
    'WAWI': 'WAWI.OL',
    'OLT': 'OLT.OL',
    'SWONZ': 'SWONZ.OL',
    'EQUI': 'EQUI.OL',
    'AAPL': 'AAPL',
    'MSFT': 'MSFT'
  }

  for (const [symbol, yahooSymbol] of Object.entries(knownMappings)) {
    try {
      const result = await prisma.holding.updateMany({
        where: { symbol },
        data: { symbolYahoo: yahooSymbol }
      })
      
      if (result.count > 0) {
        console.log(`Updated ${result.count} holdings for ${symbol} → ${yahooSymbol}`)
      }
    } catch (error) {
      console.error(`Error updating ${symbol}:`, error)
    }
  }
  
  console.log('Done populating Yahoo symbols')
}

populateYahooSymbols()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

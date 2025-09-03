import { YahooMarketDataService } from '../../lib/yahooMarketData'

export default defineEventHandler(async (_event) => {
  try {
    const yahooMarketData = new YahooMarketDataService()
    
    // Test with a mix of Norwegian and US stocks
    const symbols = ['EQNR', 'NHY', 'AAPL', 'TSLA']
    
    console.log('Testing authenticated batch Yahoo Finance API...')
    const results = await yahooMarketData.getBatchQuotes(symbols)
    
    return {
      success: true,
      message: `Successfully fetched ${results.length} out of ${symbols.length} quotes using authenticated batch API`,
      data: results,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Batch test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})

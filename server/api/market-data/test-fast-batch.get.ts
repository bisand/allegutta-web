import { YahooMarketDataService } from '../../lib/yahooMarketData'

export default defineEventHandler(async (_event) => {
  try {
    const yahooService = new YahooMarketDataService()
    
    // Test with just a few symbols to make it faster
    const symbols = ['EQNR', 'AAPL']
    
    console.log('Testing fast batch with mixed symbols...')
    const results = await yahooService.getBatchQuotes(symbols)
    
    return {
      success: true,
      message: `Successfully fetched ${results.length} out of ${symbols.length} quotes using Yahoo Finance`,
      data: results,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Fast batch test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})

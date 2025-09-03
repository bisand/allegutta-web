export default defineEventHandler(async (_event) => {
  try {
    const { YahooMarketDataService } = await import('../../lib/yahooMarketData')
    
    const service = new YahooMarketDataService()
    
    // Test with a small subset of symbols - mix of Norwegian and US stocks
    const testSymbols = ['EQNR', 'AAPL', 'TEL']
    
    console.log('Testing new authentication approach with symbols:', testSymbols)
    
    const results = await service.getBatchQuotes(testSymbols)
    
    return {
      success: true,
      symbolCount: testSymbols.length,
      resultCount: results.length,
      results: results,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Error in new auth test:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})

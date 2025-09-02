export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const symbol = (query.symbol as string) || 'EQUI'

    // Test symbol formatting logic with known Norwegian and US stocks
    const testSymbols = [symbol, 'AAPL', 'MSFT', 'EQNR', 'NHY', 'TEL', 'DNB', 'TEL.OL']
    
    // Known Norwegian/OSE symbols for testing (corrected tickers)
    const knownOSESymbols = [
      'EQNR', 'NHY', 'TEL', 'DNB', 'MOWI', 'REC', 'YAR', 'ORK', 'SCATC', 
      'BAKKA', 'SALM', 'AKRBP', 'SUBC', 'OTEC', 'NEL', 'KAHOT', 'TGS', 
      'LSG', 'XXL', 'MPCC', 'FJORD'
    ]
    
    const results = []
    for (const testSymbol of testSymbols) {
      let formatted = testSymbol
      
      // Apply the same logic as in YahooMarketDataService
      if (!testSymbol.includes('.')) {
        if (knownOSESymbols.includes(testSymbol.toUpperCase())) {
          formatted = `${testSymbol}.OL`
        }
      }
      
      results.push({
        original: testSymbol,
        formatted: formatted,
        isOSE: !testSymbol.includes('.') && knownOSESymbols.includes(testSymbol.toUpperCase())
      })
    }

    return {
      success: true,
      symbolTransformations: results,
      knownOSESymbols,
      message: 'Symbol formatting test completed',
      note: 'Shows how symbols are transformed for Yahoo Finance based on known OSE symbols'
    }
  } catch (error) {
    console.error('Error in symbol test:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to test symbol formatting',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

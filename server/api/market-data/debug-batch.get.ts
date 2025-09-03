export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const symbols = (query.symbols as string)?.split(',') || ['EQNR']
    
    console.log(`Debug: Testing batch request for symbols: ${symbols.join(', ')}`)
    
    // Format symbols for debugging
    const formattedSymbols = symbols.map(symbol => {
      // Apply the same formatting logic
      if (symbol.includes('.')) {
        return symbol
      }
      
      const knownOSESymbols = ['EQNR', 'NHY', 'TEL', 'DNB']
      if (knownOSESymbols.includes(symbol.toUpperCase())) {
        return `${symbol.toUpperCase()}.OL`
      }
      
      return symbol.toUpperCase()
    })
    
    console.log(`Debug: Formatted symbols: ${formattedSymbols.join(', ')}`)
    
    // Build URL manually for debugging
    const baseUrl = 'https://query2.finance.yahoo.com/v7/finance/quote'
    const url = new URL(baseUrl)
    
    url.searchParams.set('formatted', 'false')
    url.searchParams.set('lang', 'nb-NO')
    url.searchParams.set('region', 'NO')
    url.searchParams.set('symbols', formattedSymbols.join(','))
    url.searchParams.set('fields', 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,currency,symbol')
    url.searchParams.set('corsDomain', 'finance.yahoo.com')
    
    console.log(`Debug: Request URL: ${url.toString()}`)
    
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-Tracker/1.0)',
        'Referer': 'https://finance.yahoo.com/'
      }
    })
    
    console.log(`Debug: Response status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Debug: Error response: ${errorText}`)
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        errorBody: errorText
      }
    }

    const data = await response.json()
    console.log(`Debug: Response data:`, data)

    return {
      success: true,
      requestUrl: url.toString(),
      symbols: symbols,
      formattedSymbols: formattedSymbols,
      responseData: data,
      provider: 'Yahoo Finance Debug'
    }
  } catch (error) {
    console.error('Debug: Error in batch debug:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider: 'Yahoo Finance Debug'
    }
  }
})

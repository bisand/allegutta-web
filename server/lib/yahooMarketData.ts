export interface MarketDataPrice {
  symbol: string
  price: number
  currency: string
  lastUpdated: Date
  change?: number
  changePercent?: string
}

export interface YahooFinanceQuote {
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  currency: string
  symbol: string
  regularMarketTime: number
}

export class YahooMarketDataService {
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart'
  private requestCount = 0
  private readonly RATE_LIMIT_DELAY = 15000 // 15 seconds between requests (respectful to Yahoo)

  private formatSymbolForYahoo(symbol: string): string {
    // If it already has an exchange suffix, use as is
    if (symbol.includes('.')) {
      return symbol
    }
    
    // Handle known Norwegian/OSE symbols by adding .OL
    if (this.isKnownOSESymbol(symbol)) {
      return `${symbol}.OL`
    }
    
    // For US stocks and other known exchanges, use symbol as is
    // Default behavior: assume it's a US stock unless we know otherwise
    return symbol
  }

  private isKnownOSESymbol(symbol: string): boolean {
    // List of known Norwegian/OSE symbols (using correct Yahoo Finance tickers)
    const knownOSESymbols = [
      'EQNR',   // Equinor (was EQUI)
      'NHY',    // Norsk Hydro
      'TEL',    // Telenor
      'DNB',    // DNB Bank
      'MOWI',   // Mowi
      'REC',    // REC Silicon
      'YAR',    // Yara International
      'ORK',    // Orkla
      'SCATC',  // Scatec (was STL)
      'BAKKA',  // Bakkavor
      'SALM',   // SalMar
      'AKRBP',  // Aker BP
      'SUBC',   // Subsea 7
      'OTEC',   // Otec
      'NEL',    // Nel
      'KAHOT',  // Kahoot!
      'TGS',    // TGS
      'LSG',    // Leroy Seafood Group
      'XXL',    // XXL
      'MPCC',   // MPC Container Ships
      'FJORD'   // Fjord1
      // Add more Norwegian stocks as needed
    ]
    
    return knownOSESymbols.includes(symbol.toUpperCase())
  }

  private isOSESymbol(symbol: string): boolean {
    // Legacy method - keeping for backward compatibility but using the more specific one above
    return this.isKnownOSESymbol(symbol)
  }

  private normalizeSymbolFromYahoo(yahooSymbol: string, originalSymbol: string): string {
    // Return the original symbol format for consistency in our database
    if (yahooSymbol.endsWith('.OL') && !originalSymbol.endsWith('.OL')) {
      return yahooSymbol.replace('.OL', '')
    }
    return originalSymbol
  }

  private async rateLimitedRequest(url: string): Promise<Response> {
    if (this.requestCount > 0) {
      console.log(`Rate limiting: waiting ${this.RATE_LIMIT_DELAY}ms before next request`)
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY))
    }

    this.requestCount++
    
    console.log(`Making Yahoo Finance request #${this.requestCount}: ${url}`)
    return fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-Tracker/1.0)'
      }
    })
  }

  async getQuote(symbol: string): Promise<MarketDataPrice | null> {
    try {
      const yahooSymbol = this.formatSymbolForYahoo(symbol)
      const url = `${this.baseUrl}/${yahooSymbol}?interval=1d&range=1d`
      
      const response = await this.rateLimitedRequest(url)
      
      if (!response.ok) {
        console.error(`HTTP error for ${symbol} (${yahooSymbol}): ${response.status} ${response.statusText}`)
        return null
      }

      const data = await response.json()
      
      // Check if we have valid data
      if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        console.warn(`No chart data found for symbol: ${symbol} (${yahooSymbol})`)
        return null
      }

      const result = data.chart.result[0]
      const meta = result.meta
      
      if (!meta || typeof meta.regularMarketPrice !== 'number') {
        console.warn(`No price data found for symbol: ${symbol} (${yahooSymbol})`)
        return null
      }

      const change = meta.previousClose ? meta.regularMarketPrice - meta.previousClose : 0
      const changePercent = meta.previousClose && meta.previousClose > 0 
        ? ((change / meta.previousClose) * 100).toFixed(2)
        : '0.00'

      return {
        symbol: this.normalizeSymbolFromYahoo(meta.symbol || yahooSymbol, symbol),
        price: meta.regularMarketPrice,
        currency: meta.currency || 'NOK', // Default to NOK for OSE stocks
        lastUpdated: new Date(meta.regularMarketTime * 1000),
        change: change,
        changePercent: `${changePercent}%`
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      return null
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<MarketDataPrice[]> {
    const results: MarketDataPrice[] = []
    
    console.log(`Fetching quotes for ${symbols.length} symbols from Yahoo Finance...`)
    
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol)
      if (quote) {
        results.push(quote)
      }
      
                  // Long delay between requests to be respectful to Yahoo Finance (15 seconds minimum)
      await new Promise(resolve => setTimeout(resolve, 15000))
    }
    
    console.log(`Successfully fetched ${results.length} out of ${symbols.length} quotes`)
    return results
  }

  // Batch request method for better performance (Yahoo Finance supports multiple symbols)
  async getBatchQuotes(symbols: string[]): Promise<MarketDataPrice[]> {
    try {
      // Format symbols for Yahoo Finance (add .OL for OSE stocks, etc.)
      const formattedSymbols = symbols.map(symbol => this.formatSymbolForYahoo(symbol))
      const symbolList = formattedSymbols.join(',')
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}`
      
      console.log(`Making batch Yahoo Finance request for symbols: ${symbolList}`)
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-Tracker/1.0)'
        }
      })
      
      if (!response.ok) {
        console.error(`Batch request failed: ${response.status} ${response.statusText}`)
        return []
      }

      const data = await response.json()
      
      console.log('Yahoo Finance batch response:', JSON.stringify(data, null, 2))
      
      if (!data.quoteResponse || !data.quoteResponse.result) {
        console.warn('No quote response data found')
        return []
      }

      const results: MarketDataPrice[] = []
      
      for (let i = 0; i < data.quoteResponse.result.length; i++) {
        const quote = data.quoteResponse.result[i]
        const originalSymbol = symbols[i] // Get the original symbol format
        
        if (quote.regularMarketPrice && typeof quote.regularMarketPrice === 'number') {
          const change = quote.regularMarketChangePercent || 0
          const changePercent = change.toFixed(2)

          results.push({
            symbol: this.normalizeSymbolFromYahoo(quote.symbol, originalSymbol),
            price: quote.regularMarketPrice,
            currency: quote.currency || 'NOK', // Default to NOK for OSE stocks
            lastUpdated: new Date(quote.regularMarketTime ? quote.regularMarketTime * 1000 : Date.now()),
            change: quote.regularMarketChange || 0,
            changePercent: `${changePercent}%`
          })
        }
      }
      
      console.log(`Batch request: fetched ${results.length} out of ${symbols.length} quotes`)
      return results
    } catch (error) {
      console.error('Error in batch quote request:', error)
      return []
    }
  }
}

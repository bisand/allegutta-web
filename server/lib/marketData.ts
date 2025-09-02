export interface MarketDataPrice {
  symbol: string
  price: number
  currency: string
  lastUpdated: Date
}

export interface AlphaVantageQuote {
  'Global Quote': {
    '01. symbol': string
    '02. open': string
    '03. high': string
    '04. low': string
    '05. price': string
    '06. volume': string
    '07. latest trading day': string
    '08. previous close': string
    '09. change': string
    '10. change percent': string
  }
}

export class MarketDataService {
  private apiKey: string
  private baseUrl = 'https://www.alphavantage.co/query'
  private requestCount = 0
  private lastRequestTime = 0
  private readonly RATE_LIMIT_DELAY = 12000 // 12 seconds between requests (5 per minute)

  constructor(apiKey: string) {
    this.apiKey = apiKey
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key not configured')
    }
  }

  private async rateLimitedRequest(url: string): Promise<Response> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
    this.requestCount++
    
    console.log(`Making Alpha Vantage request #${this.requestCount}: ${url}`)
    return fetch(url)
  }

  async getQuote(symbol: string): Promise<MarketDataPrice | null> {
    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`
      
      const response = await this.rateLimitedRequest(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: AlphaVantageQuote = await response.json()
      
      // Check for API error responses
      if ('Error Message' in data) {
        console.error(`Alpha Vantage error for ${symbol}:`, data)
        return null
      }

      if ('Note' in data) {
        console.warn(`Alpha Vantage rate limit hit for ${symbol}:`, data)
        return null
      }

      const quote = data['Global Quote']
      if (!quote || !quote['05. price']) {
        console.warn(`No quote data found for symbol: ${symbol}`)
        return null
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        currency: 'USD', // Alpha Vantage typically returns USD prices
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      return null
    }
  }

  async getMultipleQuotes(symbols: string[]): Promise<MarketDataPrice[]> {
    const results: MarketDataPrice[] = []
    
    console.log(`Fetching quotes for ${symbols.length} symbols...`)
    
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol)
      if (quote) {
        results.push(quote)
      }
      
      // Small delay between requests to be extra safe with rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`Successfully fetched ${results.length} out of ${symbols.length} quotes`)
    return results
  }
}

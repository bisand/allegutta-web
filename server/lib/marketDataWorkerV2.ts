import type { PrismaClient } from '@prisma/client'
import { fetchWithRetry } from '~~/server/utils/fetchWithRetry'

interface CacheData {
  cookie: string
  crumb: string
  ts: number
}

interface QuoteResult {
  symbol: string
  longName?: string
  shortName?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  regularMarketPreviousClose?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketDayRange?: string
  regularMarketVolume?: number
  regularMarketTime?: number
  
  // 52-week data
  fiftyTwoWeekLow?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekRange?: string
  
  // Market info
  exchange?: string
  fullExchangeName?: string
  marketState?: string
  currency?: string
}

interface YahooQuoteResponse {
  quoteResponse: {
    result: QuoteResult[]
    error: unknown
  }
}

export class MarketDataWorkerV2 {
  private prisma: PrismaClient
  private isRunning = false
  private intervalId?: NodeJS.Timeout
  private cached: CacheData = { cookie: '', crumb: '', ts: 0 }

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  private async getCookieAndCrumb(): Promise<CacheData> {
    // Cache for 10 minutes
    if (Date.now() - this.cached.ts < 600_000 && this.cached.cookie && this.cached.crumb) {
      return this.cached
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
    }

    try {
      // Step 1: Get cookie
      const r1 = await fetchWithRetry('https://fc.yahoo.com/', {
        redirect: 'manual',
        headers
      })
      const setCookie = r1.headers.get('set-cookie')
      const cookie = setCookie ? setCookie.split(',')[0] : ''

      // Step 2: Get crumb
      const r2 = await fetchWithRetry('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: { ...headers, Cookie: cookie }
      })
      const crumb = (await r2.text()).trim()

      this.cached = { cookie, crumb, ts: Date.now() }
      console.log('Successfully refreshed Yahoo Finance cookie and crumb')
      
      return this.cached
    } catch (error) {
      console.error('Failed to get cookie and crumb:', error)
      throw error
    }
  }

  private async resolveYahooSymbol(isin: string): Promise<string | null> {
    try {
      console.log(`Resolving Yahoo symbol for ISIN: ${isin}`)
      const response = await fetch(`http://localhost:3000/api/finance/instruments/search/${isin}`)
      
      if (!response.ok) {
        console.warn(`Failed to resolve ISIN ${isin}: ${response.status}`)
        return null
      }
      
      const symbolYahoo = await response.text()
      
      // Remove quotes if present and validate
      const cleanSymbol = symbolYahoo.replace(/['"]/g, '').trim()
      if (cleanSymbol && cleanSymbol !== 'null' && cleanSymbol !== 'undefined') {
        console.log(`Resolved ISIN ${isin} → ${cleanSymbol}`)
        return cleanSymbol
      }
      
      console.warn(`No valid symbol found for ISIN: ${isin}`)
      return null
    } catch (error) {
      console.error(`Error resolving ISIN ${isin}:`, error)
      return null
    }
  }

  private async ensureMarketDataRecords(): Promise<void> {
    console.log('Ensuring market data records exist...')
    
    // Get unique ISINs from holdings and transactions that don't have market data records
    const missingISINs = await this.prisma.$queryRaw`
      SELECT DISTINCT h.isin, h.symbol
      FROM holdings h
      WHERE h.isin IS NOT NULL 
      AND h.isin NOT IN (SELECT isin FROM market_data)
      
      UNION
      
      SELECT DISTINCT t.isin, t.symbol
      FROM transactions t
      WHERE t.isin IS NOT NULL 
      AND t.isin NOT IN (SELECT isin FROM market_data)
    ` as Array<{isin: string, symbol: string}>

    console.log(`Found ${missingISINs.length} ISINs needing market data records`)

    for (const item of missingISINs) {
      try {
        // Resolve Yahoo symbol if needed
        const symbolYahoo = await this.resolveYahooSymbol(item.isin)
        
        // Create market data record
        await this.prisma.marketData.create({
          data: {
            isin: item.isin,
            symbol: item.symbol,
            symbolYahoo: symbolYahoo,
          }
        })
        
        console.log(`Created market data record for ${item.symbol} (${item.isin})`)
        
        // Rate limit to be respectful
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error creating market data record for ${item.symbol}:`, error)
      }
    }
  }

  private async getBatchQuotes(marketDataRecords: Array<{isin: string, symbolYahoo: string}>): Promise<QuoteResult[]> {
    if (!marketDataRecords.length) {
      return []
    }

    const validRecords = marketDataRecords.filter(r => r.symbolYahoo)
    if (!validRecords.length) {
      return []
    }

    try {
      const { cookie, crumb } = await this.getCookieAndCrumb()
      const yahooSymbols = validRecords.map(r => r.symbolYahoo)

      console.log(`Fetching quotes for Yahoo symbols: ${yahooSymbols.join(', ')}`)

      const fields = [
        'longName', 'shortName', 'regularMarketChange', 'regularMarketChangePercent',
        'regularMarketDayHigh', 'regularMarketDayLow', 'regularMarketDayRange',
        'regularMarketPreviousClose', 'regularMarketPrice', 'regularMarketTime',
        'regularMarketVolume', 'fiftyTwoWeekLow', 'fiftyTwoWeekHigh', 'fiftyTwoWeekRange',
        'exchange', 'fullExchangeName', 'marketState', 'currency'
      ]

      const params = new URLSearchParams({
        fields: fields.join(','),
        formatted: 'false',
        symbols: yahooSymbols.join(','),
        enablePrivateCompany: 'true',
        overnightPrice: 'true',
        lang: 'en-US',
        region: 'NO',
        crumb
      })

      const response = await fetchWithRetry(
        `https://query1.finance.yahoo.com/v7/finance/quote?${params}`,
        { 
          headers: { 
            Cookie: cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          } 
        }
      )

      if (!response.ok) {
        throw new Error(`Yahoo Finance API returned ${response.status}: ${response.statusText}`)
      }

      const data: YahooQuoteResponse = await response.json()
      
      if (data.quoteResponse.error) {
        throw new Error(`Yahoo Finance API error: ${JSON.stringify(data.quoteResponse.error)}`)
      }

      console.log(`Successfully fetched quotes for ${yahooSymbols.length} symbols`)
      return data.quoteResponse.result || []

    } catch (error) {
      console.error(`Error fetching batch quotes:`, error)
      throw error
    }
  }

  async updateAllMarketData(): Promise<void> {
    console.log('Starting market data update...')
    
    try {
      // First ensure all ISINs have market data records
      await this.ensureMarketDataRecords()
      
      // Get market data records that need updating
      const marketDataRecords = await this.prisma.marketData.findMany({
        where: {
          symbolYahoo: { not: null }
        },
        select: {
          isin: true,
          symbolYahoo: true,
          symbol: true
        }
      })

      console.log(`Found ${marketDataRecords.length} market data records to update`)

      if (marketDataRecords.length === 0) {
        console.log('No market data records found to update')
        return
      }

      const validRecords = marketDataRecords.filter(r => r.symbolYahoo) as Array<{isin: string, symbolYahoo: string}>
      console.log(`Found ${validRecords.length} records with Yahoo symbols`)

      // Fetch quotes from Yahoo Finance
      const quotes = await this.getBatchQuotes(validRecords)
      console.log(`Received ${quotes.length} quotes from Yahoo Finance`)
      
      if (quotes.length === 0) {
        console.log('No quotes received from Yahoo Finance')
        return
      }

      // Create symbol to ISIN mapping
      const symbolToISIN = new Map<string, string>()
      validRecords.forEach(record => {
        symbolToISIN.set(record.symbolYahoo, record.isin)
      })

      // Update market data records
      console.log('Starting market data updates...')
      let updatedCount = 0
      
      for (const quote of quotes) {
        const isin = symbolToISIN.get(quote.symbol)
        if (isin && quote.regularMarketPrice) {
          try {
            await this.prisma.marketData.update({
              where: { isin },
              data: {
                currentPrice: quote.regularMarketPrice,
                longName: quote.longName,
                shortName: quote.shortName,
                regularMarketChange: quote.regularMarketChange,
                regularMarketChangePercent: quote.regularMarketChangePercent,
                regularMarketPreviousClose: quote.regularMarketPreviousClose,
                regularMarketDayHigh: quote.regularMarketDayHigh,
                regularMarketDayLow: quote.regularMarketDayLow,
                regularMarketDayRange: quote.regularMarketDayRange,
                regularMarketVolume: quote.regularMarketVolume,
                regularMarketTime: quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000) : null,
                fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
                fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
                fiftyTwoWeekRange: quote.fiftyTwoWeekRange,
                exchange: quote.exchange,
                fullExchangeName: quote.fullExchangeName,
                marketState: quote.marketState,
                currency: quote.currency,
                lastUpdated: new Date()
              }
            })
            
            updatedCount++
            console.log(`Updated market data for ${quote.symbol} (${isin}): $${quote.regularMarketPrice}`)
          } catch (error) {
            console.error(`Error updating market data for ${quote.symbol}:`, error)
          }
        }
      }

      console.log(`Market data update completed. Updated ${updatedCount} records.`)
    } catch (error) {
      console.error('Error during market data update:', error)
      throw error
    }
  }

  startPeriodicUpdates(intervalMinutes: number = 120): void {
    if (this.isRunning) {
      console.log('Market data worker is already running')
      return
    }

    this.isRunning = true
    console.log(`Starting periodic market data updates every ${intervalMinutes} minutes`)

    // Run immediately
    this.updateAllMarketData()

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.updateAllMarketData()
    }, intervalMinutes * 60 * 1000)
  }

  stopPeriodicUpdates(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('Stopped periodic market data updates')
  }

  isWorkerRunning(): boolean {
    return this.isRunning
  }

  invalidateCache(): void {
    this.cached = { cookie: '', crumb: '', ts: 0 }
    console.log('Market data cache invalidated')
  }
}

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
  fiftyTwoWeekLowChange?: number
  fiftyTwoWeekHighChange?: number
  fiftyTwoWeekLowChangePercent?: number
  fiftyTwoWeekHighChangePercent?: number
  fiftyTwoWeekRange?: string
  
  // Market/Exchange info
  exchange?: string
  exchangeTimezoneName?: string
  exchangeTimezoneShortName?: string
  fullExchangeName?: string
  marketState?: string
  currency?: string
  
  // Company info
  quoteType?: string
  typeDisp?: string
  firstTradeDateMilliseconds?: number
  
  // Additional fields
  language?: string
  region?: string
  priceHint?: number
  exchangeDataDelayedBy?: number
  sourceInterval?: number
}

interface YahooQuoteResponse {
  quoteResponse: {
    result: QuoteResult[]
    error: unknown
  }
}

export class MarketDataWorker {
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

  private async getBatchQuotes(symbols: string[]): Promise<QuoteResult[]> {
    if (!symbols.length) {
      return []
    }

    try {
      const { cookie, crumb } = await this.getCookieAndCrumb()

      const fields = [
        'longName',
        'shortName',
        'regularMarketChange',
        'regularMarketChangePercent',
        'regularMarketDayHigh',
        'regularMarketDayLow',
        'regularMarketDayRange',
        'regularMarketPreviousClose',
        'regularMarketPrice',
        'regularMarketTime',
        'regularMarketVolume',
        'fiftyTwoWeekLow',
        'fiftyTwoWeekHigh',
        'fiftyTwoWeekLowChange',
        'fiftyTwoWeekHighChange',
        'fiftyTwoWeekLowChangePercent',
        'fiftyTwoWeekHighChangePercent',
        'fiftyTwoWeekRange',
        'exchange',
        'exchangeTimezoneName',
        'exchangeTimezoneShortName',
        'fullExchangeName',
        'marketState',
        'currency',
        'quoteType',
        'typeDisp',
        'firstTradeDateMilliseconds',
        'language',
        'region',
        'priceHint',
        'exchangeDataDelayedBy',
        'sourceInterval'
      ]

      const params = new URLSearchParams({
        fields: fields.join(','),
        formatted: 'false',
        symbols: symbols.join(','),
        enablePrivateCompany: 'true',
        overnightPrice: 'true',
        lang: 'en-US',
        region: 'US',
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

      console.log(`Successfully fetched quotes for ${symbols.length} symbols`)
      return data.quoteResponse.result || []

    } catch (error) {
      console.error(`Error fetching batch quotes for symbols ${symbols.join(',')}:`, error)
      throw error
    }
  }

  async updateAllHoldings(): Promise<void> {
    console.log('Starting market data update for all holdings...')
    
    try {
      console.log('Fetching holdings from database...')
      // Get all unique symbols from holdings
      const holdings = await this.prisma.holding.findMany({
        select: {
          symbol: true,
          portfolioId: true,
          id: true
        },
        distinct: ['symbol']
      })

      console.log(`Database query completed. Found ${holdings.length} holdings`)

      if (holdings.length === 0) {
        console.log('No holdings found to update')
        return
      }

      const symbols = holdings.map(h => h.symbol)
      console.log(`Found ${symbols.length} unique symbols to update: ${symbols.join(', ')}`)

      console.log('Starting market data fetch...')
      // Fetch market data for all symbols using the working batch method
      const marketData = await this.getBatchQuotes(symbols)
      console.log(`Market data fetch completed. Received ${marketData.length} quotes`)
      
      if (marketData.length === 0) {
        console.log('No market data received')
        return
      }

      // Update holdings with new prices
      console.log('Starting database updates...')
      let updatedCount = 0
      for (const quote of marketData) {
        try {
          if (quote.regularMarketPrice) {
            console.log(`Updating holdings for ${quote.symbol} (${quote.shortName || quote.longName}):`)
            console.log(`  Price: $${quote.regularMarketPrice} (${quote.regularMarketChangePercent?.toFixed(2)}%)`)
            console.log(`  Exchange: ${quote.fullExchangeName || quote.exchange} (${quote.currency || 'N/A'})`)
            console.log(`  52W Range: ${quote.fiftyTwoWeekRange || 'N/A'}`)
            console.log(`  Volume: ${quote.regularMarketVolume?.toLocaleString() || 'N/A'}`)
            
            const result = await this.prisma.holding.updateMany({
              where: {
                symbol: quote.symbol
              },
              data: {
                currentPrice: quote.regularMarketPrice,
                lastUpdated: new Date(quote.regularMarketTime ? quote.regularMarketTime * 1000 : Date.now())
              }
            })
            
            updatedCount += result.count
            console.log(`  → Updated ${result.count} holdings\n`)
          }
        } catch (error) {
          console.error(`Error updating holdings for ${quote.symbol}:`, error)
        }
      }

      console.log(`Market data update completed. Updated ${updatedCount} holdings total.`)
    } catch (error) {
      console.error('Error during market data update:', error)
      throw error // Re-throw to let the caller handle it
    }
  }

  async updateSpecificHoldings(portfolioId: string): Promise<void> {
    console.log(`Starting market data update for portfolio ${portfolioId}...`)
    
    try {
      // Get holdings for specific portfolio
      const holdings = await this.prisma.holding.findMany({
        where: {
          portfolioId: portfolioId
        },
        select: {
          symbol: true,
          id: true
        }
      })

      if (holdings.length === 0) {
        console.log(`No holdings found for portfolio ${portfolioId}`)
        return
      }

      const symbols = [...new Set(holdings.map(h => h.symbol))] // Remove duplicates
      console.log(`Found ${symbols.length} unique symbols for portfolio ${portfolioId}: ${symbols.join(', ')}`)

      // Fetch market data using the working batch method
      const marketData = await this.getBatchQuotes(symbols)
      
      // Update holdings with new prices
      let updatedCount = 0
      for (const quote of marketData) {
        try {
          if (quote.regularMarketPrice) {
            console.log(`Updating ${quote.symbol} (${quote.shortName || quote.longName}) in portfolio ${portfolioId}:`)
            console.log(`  Price: $${quote.regularMarketPrice} (${quote.regularMarketChangePercent?.toFixed(2)}%)`)
            
            const result = await this.prisma.holding.updateMany({
              where: {
                portfolioId: portfolioId,
                symbol: quote.symbol
              },
              data: {
                currentPrice: quote.regularMarketPrice,
                lastUpdated: new Date(quote.regularMarketTime ? quote.regularMarketTime * 1000 : Date.now())
              }
            })
            
            updatedCount += result.count
            console.log(`  → Updated ${result.count} holdings`)
          }
        } catch (error) {
          console.error(`Error updating holding for ${quote.symbol}:`, error)
        }
      }

      console.log(`Portfolio market data update completed. Updated ${updatedCount} holdings.`)
    } catch (error) {
      console.error(`Error during portfolio market data update for ${portfolioId}:`, error)
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
    this.updateAllHoldings()

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.updateAllHoldings()
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

  // Force refresh of cached credentials
  invalidateCache(): void {
    this.cached = { cookie: '', crumb: '', ts: 0 }
    console.log('Market data cache invalidated')
  }
}

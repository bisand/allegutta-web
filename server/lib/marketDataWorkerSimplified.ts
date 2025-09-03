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

  private async getBatchQuotes(yahooSymbols: string[]): Promise<QuoteResult[]> {
    if (!yahooSymbols.length) {
      return []
    }

    try {
      const { cookie, crumb } = await this.getCookieAndCrumb()

      console.log(`Fetching quotes for Yahoo symbols: ${yahooSymbols.join(', ')}`)

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
        'fiftyTwoWeekRange',
        'exchange',
        'fullExchangeName',
        'marketState',
        'currency'
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

  async updateAllHoldings(): Promise<void> {
    console.log('Starting market data update for all holdings...')
    
    try {
      console.log('Fetching holdings from database...')
      
      // Use raw SQL to get holdings with Yahoo symbols (avoiding TypeScript issues)
      const holdings = await this.prisma.$queryRaw`
        SELECT id, symbol, symbolYahoo, portfolioId 
        FROM holdings 
        WHERE symbolYahoo IS NOT NULL 
        AND symbolYahoo != ''
      ` as Array<{id: string, symbol: string, symbolYahoo: string, portfolioId: string}>

      console.log(`Database query completed. Found ${holdings.length} holdings with Yahoo symbols`)

      if (holdings.length === 0) {
        console.log('No holdings with Yahoo symbols found to update')
        return
      }

      const yahooSymbols = [...new Set(holdings.map(h => h.symbolYahoo))]
      console.log(`Found ${yahooSymbols.length} unique Yahoo symbols to update`)

      console.log('Starting market data fetch...')
      const marketData = await this.getBatchQuotes(yahooSymbols)
      console.log(`Market data fetch completed. Received ${marketData.length} quotes`)
      
      if (marketData.length === 0) {
        console.log('No market data received')
        return
      }

      // Create a map of Yahoo symbol to quote data
      const quoteMap = new Map<string, QuoteResult>()
      marketData.forEach(quote => {
        quoteMap.set(quote.symbol, quote)
      })

      // Update holdings with new prices
      console.log('Starting database updates...')
      let updatedCount = 0
      
      for (const holding of holdings) {
        const quote = quoteMap.get(holding.symbolYahoo)
        if (quote && quote.regularMarketPrice) {
          try {
            console.log(`Updating ${holding.symbol} (${holding.symbolYahoo}) → ${quote.shortName || quote.longName}:`)
            console.log(`  Price: $${quote.regularMarketPrice} (${quote.regularMarketChangePercent?.toFixed(2)}%)`)
            console.log(`  Exchange: ${quote.fullExchangeName || quote.exchange}`)
            
            // Use raw SQL to update to avoid TypeScript field issues
            await this.prisma.$executeRaw`
              UPDATE holdings 
              SET 
                currentPrice = ${quote.regularMarketPrice},
                lastUpdated = ${new Date()},
                longName = ${quote.longName || null},
                shortName = ${quote.shortName || null},
                regularMarketChange = ${quote.regularMarketChange || null},
                regularMarketChangePercent = ${quote.regularMarketChangePercent || null},
                regularMarketPreviousClose = ${quote.regularMarketPreviousClose || null},
                regularMarketDayHigh = ${quote.regularMarketDayHigh || null},
                regularMarketDayLow = ${quote.regularMarketDayLow || null},
                regularMarketDayRange = ${quote.regularMarketDayRange || null},
                regularMarketVolume = ${quote.regularMarketVolume || null},
                regularMarketTime = ${quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000) : null},
                fiftyTwoWeekLow = ${quote.fiftyTwoWeekLow || null},
                fiftyTwoWeekHigh = ${quote.fiftyTwoWeekHigh || null},
                fiftyTwoWeekRange = ${quote.fiftyTwoWeekRange || null},
                exchange = ${quote.exchange || null},
                fullExchangeName = ${quote.fullExchangeName || null},
                marketState = ${quote.marketState || null}
              WHERE id = ${holding.id}
            `
            
            updatedCount++
            console.log(`  → Updated holding with market data\n`)
          } catch (error) {
            console.error(`Error updating holding ${holding.symbol}:`, error)
          }
        }
      }

      console.log(`Market data update completed. Updated ${updatedCount} holdings total.`)
    } catch (error) {
      console.error('Error during market data update:', error)
      throw error
    }
  }

  async updateSpecificHoldings(portfolioId: string): Promise<void> {
    console.log(`Starting market data update for portfolio ${portfolioId}...`)
    
    try {
      // Use raw SQL for portfolio-specific holdings
      const holdings = await this.prisma.$queryRaw`
        SELECT id, symbol, symbolYahoo 
        FROM holdings 
        WHERE portfolioId = ${portfolioId}
        AND symbolYahoo IS NOT NULL 
        AND symbolYahoo != ''
      ` as Array<{id: string, symbol: string, symbolYahoo: string}>

      if (holdings.length === 0) {
        console.log(`No holdings with Yahoo symbols found for portfolio ${portfolioId}`)
        return
      }

      const yahooSymbols = [...new Set(holdings.map(h => h.symbolYahoo))]
      console.log(`Found ${yahooSymbols.length} unique Yahoo symbols for portfolio ${portfolioId}`)

      const marketData = await this.getBatchQuotes(yahooSymbols)
      
      // Similar update logic as above but for specific portfolio
      const quoteMap = new Map<string, QuoteResult>()
      marketData.forEach(quote => {
        quoteMap.set(quote.symbol, quote)
      })

      let updatedCount = 0
      for (const holding of holdings) {
        const quote = quoteMap.get(holding.symbolYahoo)
        if (quote && quote.regularMarketPrice) {
          try {
            await this.prisma.$executeRaw`
              UPDATE holdings 
              SET 
                currentPrice = ${quote.regularMarketPrice},
                lastUpdated = ${new Date()},
                longName = ${quote.longName || null},
                shortName = ${quote.shortName || null}
              WHERE id = ${holding.id}
            `
            updatedCount++
            console.log(`Updated ${holding.symbol} in portfolio ${portfolioId}`)
          } catch (error) {
            console.error(`Error updating holding ${holding.symbol}:`, error)
          }
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

  invalidateCache(): void {
    this.cached = { cookie: '', crumb: '', ts: 0 }
    console.log('Market data cache invalidated')
  }
}

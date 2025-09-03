import type { PrismaClient } from '@prisma/client'
import { fetchWithRetry } from '~~/server/utils/fetchWithRetry'

interface CacheData {
  cookie: string
  crumb: string
  ts: number
}

interface QuoteResult {
  symbol: string
  holdingId?: string       // For direct database updates
  originalSymbol?: string  // For mapping back to database symbols
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

  private async updateYahooSymbols(): Promise<void> {
    console.log('Updating missing Yahoo symbols...')
    
    // Find holdings with ISIN but no symbolYahoo
    const holdingsNeedingSymbols = await this.prisma.holding.findMany({
      where: {
        isin: { not: null },
        symbolYahoo: null
      },
      select: {
        id: true,
        symbol: true,
        isin: true
      }
    })

    console.log(`Found ${holdingsNeedingSymbols.length} holdings needing Yahoo symbol resolution`)

    for (const holding of holdingsNeedingSymbols) {
      if (holding.isin) {
        const symbolYahoo = await this.resolveYahooSymbol(holding.isin)
        
        if (symbolYahoo) {
          await this.prisma.holding.update({
            where: { id: holding.id },
            data: { symbolYahoo }
          })
          console.log(`Updated ${holding.symbol} with Yahoo symbol: ${symbolYahoo}`)
        }
        
        // Rate limit to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
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

  private async getBatchQuotes(holdings: Array<{id: string, symbol: string, symbolYahoo: string}>): Promise<QuoteResult[]> {
    if (!holdings.length) {
      return []
    }

    try {
      const { cookie, crumb } = await this.getCookieAndCrumb()

      const yahooSymbols = holdings.map(h => h.symbolYahoo)
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

      console.log(`Successfully fetched quotes for ${holdings.length} symbols`)
      
      // Map Yahoo symbols back to holding info for database updates
      const holdingMap = new Map<string, {id: string, symbol: string}>()
      holdings.forEach(holding => {
        holdingMap.set(holding.symbolYahoo, {id: holding.id, symbol: holding.symbol})
      })

      // Update the returned results to include holding reference for database matching
      const results = (data.quoteResponse.result || []).map(quote => ({
        ...quote,
        holdingId: holdingMap.get(quote.symbol)?.id,
        originalSymbol: holdingMap.get(quote.symbol)?.symbol || quote.symbol
      }))

      return results

    } catch (error) {
      console.error(`Error fetching batch quotes for holdings:`, error)
      throw error
    }
  }

  async updateAllHoldings(): Promise<void> {
    console.log('Starting market data update for all holdings...')
    
    try {
      // First, update any missing Yahoo symbols
      await this.updateYahooSymbols()
      
      console.log('Fetching holdings from database...')
      // Get all holdings with valid Yahoo symbols
      const holdings = await this.prisma.holding.findMany({
        where: {
          symbolYahoo: { not: null }
        },
        select: {
          id: true,
          symbol: true,
          symbolYahoo: true,
          portfolioId: true
        },
        distinct: ['symbolYahoo']
      })

      console.log(`Database query completed. Found ${holdings.length} holdings with Yahoo symbols`)

      if (holdings.length === 0) {
        console.log('No holdings with Yahoo symbols found to update')
        return
      }

      const validHoldings = holdings.filter(h => h.symbolYahoo) as Array<{id: string, symbol: string, symbolYahoo: string, portfolioId: string}>
      console.log(`Found ${validHoldings.length} valid holdings to update`)

      console.log('Starting market data fetch...')
      // Fetch market data for all holdings using the working batch method
      const marketData = await this.getBatchQuotes(validHoldings)
      console.log(`Market data fetch completed. Received ${marketData.length} quotes`)
      
      if (marketData.length === 0) {
        console.log('No market data received')
        return
      }

      // Update holdings with new prices and market data
      console.log('Starting database updates...')
      let updatedCount = 0
      for (const quote of marketData) {
        try {
          if (quote.regularMarketPrice && quote.holdingId) {
            console.log(`Updating holdings for ${quote.symbol} → ${quote.originalSymbol} (${quote.shortName || quote.longName}):`)
            console.log(`  Price: $${quote.regularMarketPrice} (${quote.regularMarketChangePercent?.toFixed(2)}%)`)
            console.log(`  Exchange: ${quote.fullExchangeName || quote.exchange} (${quote.currency || 'N/A'})`)
            console.log(`  52W Range: ${quote.fiftyTwoWeekRange || 'N/A'}`)
            console.log(`  Volume: ${quote.regularMarketVolume?.toLocaleString() || 'N/A'}`)
            
            const result = await this.prisma.holding.update({
              where: {
                id: quote.holdingId
              },
              data: {
                currentPrice: quote.regularMarketPrice,
                lastUpdated: new Date(quote.regularMarketTime ? quote.regularMarketTime * 1000 : Date.now()),
                // Store all the market data
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
                fiftyTwoWeekLowChange: quote.fiftyTwoWeekLowChange,
                fiftyTwoWeekHighChange: quote.fiftyTwoWeekHighChange,
                fiftyTwoWeekLowChangePercent: quote.fiftyTwoWeekLowChangePercent,
                fiftyTwoWeekHighChangePercent: quote.fiftyTwoWeekHighChangePercent,
                fiftyTwoWeekRange: quote.fiftyTwoWeekRange,
                exchange: quote.exchange,
                exchangeTimezoneName: quote.exchangeTimezoneName,
                exchangeTimezoneShortName: quote.exchangeTimezoneShortName,
                fullExchangeName: quote.fullExchangeName,
                marketState: quote.marketState,
                quoteType: quote.quoteType,
                typeDisp: quote.typeDisp,
                firstTradeDateMilliseconds: quote.firstTradeDateMilliseconds
              }
            })
            
            updatedCount += 1
            console.log(`  → Updated holding with full market data\n`)
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
            const dbSymbol = quote.originalSymbol || quote.symbol
            console.log(`Updating ${quote.symbol} → ${dbSymbol} (${quote.shortName || quote.longName}) in portfolio ${portfolioId}:`)
            console.log(`  Price: $${quote.regularMarketPrice} (${quote.regularMarketChangePercent?.toFixed(2)}%)`)
            
            const result = await this.prisma.holding.updateMany({
              where: {
                portfolioId: portfolioId,
                symbol: dbSymbol
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

import type { PrismaClient } from '@prisma/client'
import { YahooMarketDataService } from './yahooMarketData'

export class MarketDataWorker {
  private prisma: PrismaClient
  private marketDataService: YahooMarketDataService
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.marketDataService = new YahooMarketDataService()
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
      // Fetch market data for all symbols (using individual requests for reliability)
      const marketData = await this.marketDataService.getMultipleQuotes(symbols)
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
          console.log(`Updating holdings for ${quote.symbol} with price $${quote.price}`)
          const result = await this.prisma.holding.updateMany({
            where: {
              symbol: quote.symbol
            },
            data: {
              currentPrice: quote.price,
              lastUpdated: quote.lastUpdated
            }
          })
          
          updatedCount += result.count
          console.log(`Updated ${result.count} holdings for ${quote.symbol} with price $${quote.price}`)
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

      // Fetch market data (using individual requests for reliability)
      const marketData = await this.marketDataService.getMultipleQuotes(symbols)
      
      // Update holdings with new prices
      let updatedCount = 0
      for (const quote of marketData) {
        try {
          const result = await this.prisma.holding.updateMany({
            where: {
              portfolioId: portfolioId,
              symbol: quote.symbol
            },
            data: {
              currentPrice: quote.price,
              lastUpdated: quote.lastUpdated
            }
          })
          
          updatedCount += result.count
          console.log(`Updated ${result.count} holdings for ${quote.symbol} in portfolio ${portfolioId} with price $${quote.price}`)
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
    console.log(`Starting periodic market data updates every ${intervalMinutes} minutes (15s delay between Yahoo Finance requests)`)

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
}

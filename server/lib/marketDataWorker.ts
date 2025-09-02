import type { PrismaClient } from '@prisma/client'
import { MarketDataService } from './marketData'

export class MarketDataWorker {
  private prisma: PrismaClient
  private marketDataService: MarketDataService
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  constructor(prisma: PrismaClient, apiKey: string) {
    this.prisma = prisma
    this.marketDataService = new MarketDataService(apiKey)
  }

  async updateAllHoldings(): Promise<void> {
    console.log('Starting market data update for all holdings...')
    
    try {
      // Get all unique symbols from holdings
      const holdings = await this.prisma.holding.findMany({
        select: {
          symbol: true,
          portfolioId: true,
          id: true
        },
        distinct: ['symbol']
      })

      if (holdings.length === 0) {
        console.log('No holdings found to update')
        return
      }

      const symbols = holdings.map(h => h.symbol)
      console.log(`Found ${symbols.length} unique symbols to update: ${symbols.join(', ')}`)

      // Fetch market data for all symbols
      const marketData = await this.marketDataService.getMultipleQuotes(symbols)
      
      if (marketData.length === 0) {
        console.log('No market data received')
        return
      }

      // Update holdings with new prices
      let updatedCount = 0
      for (const quote of marketData) {
        try {
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

      // Fetch market data
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

  startPeriodicUpdates(intervalMinutes: number = 60): void {
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
}

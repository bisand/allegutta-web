import { YahooMarketDataService } from '../../lib/yahooMarketData'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const symbolsParam = query.symbols as string
    const symbols = symbolsParam ? symbolsParam.split(',') : ['AAPL', 'MSFT', 'GOOGL']

    const marketDataService = new YahooMarketDataService()
    
    console.log(`Testing Yahoo Finance batch API with symbols: ${symbols.join(', ')}`)
    const quotes = await marketDataService.getBatchQuotes(symbols)

    return {
      success: true,
      quotes,
      requestedSymbols: symbols,
      receivedCount: quotes.length,
      message: `Successfully fetched ${quotes.length} quotes from Yahoo Finance`,
      provider: 'Yahoo Finance'
    }
  } catch (error) {
    console.error('Error testing Yahoo Finance batch API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to test Yahoo Finance batch API',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

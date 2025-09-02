import { YahooMarketDataService } from '../../lib/yahooMarketData'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const symbol = (query.symbol as string) || 'AAPL'

    const marketDataService = new YahooMarketDataService()
    
    console.log(`Testing Yahoo Finance API with ${symbol}...`)
    const quote = await marketDataService.getQuote(symbol)

    if (quote) {
      return {
        success: true,
        quote,
        message: `Successfully fetched quote for ${symbol} from Yahoo Finance`,
        provider: 'Yahoo Finance'
      }
    } else {
      return {
        success: false,
        message: `No quote data found for ${symbol}`,
        provider: 'Yahoo Finance'
      }
    }
  } catch (error) {
    console.error('Error testing Yahoo Finance API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to test Yahoo Finance API',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

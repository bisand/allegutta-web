import { MarketDataService } from '../../lib/marketData'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const symbol = query.symbol as string || 'AAPL'

    const config = useRuntimeConfig()
    if (!config.alphaVantageApiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Alpha Vantage API key not configured'
      })
    }

    const marketDataService = new MarketDataService(config.alphaVantageApiKey as string)
    
    console.log(`Testing quote fetch for symbol: ${symbol}`)
    const quote = await marketDataService.getQuote(symbol)

    if (quote) {
      return {
        success: true,
        quote,
        message: `Successfully fetched quote for ${symbol}`
      }
    } else {
      return {
        success: false,
        message: `No quote data available for ${symbol}`,
        symbol
      }
    }
  } catch (error) {
    console.error('Error testing market data:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to test market data',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

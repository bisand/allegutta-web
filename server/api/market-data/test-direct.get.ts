export default defineEventHandler(async (_event) => {
  try {
    const config = useRuntimeConfig()
    const apiKey = config.alphaVantageApiKey as string

    if (!apiKey) {
      return {
        success: false,
        message: 'Alpha Vantage API key not configured'
      }
    }

    // Test direct API call without rate limiting
    const symbol = 'AAPL'
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    
    console.log(`Testing direct Alpha Vantage API call: ${url}`)
    
    const response = await fetch(url)
    const data = await response.json()

    return {
      success: true,
      data,
      message: 'Direct API call completed',
      url: url.replace(apiKey, 'HIDDEN')
    }
  } catch (error) {
    console.error('Error in direct API test:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Direct API call failed'
    }
  }
})

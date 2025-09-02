import { getMarketDataWorker } from '../../lib/globalMarketDataWorker'

export default defineEventHandler(async (event) => {
  try {
    console.log('Market data update endpoint called')
    
    const query = getQuery(event)
    const portfolioId = query.portfolioId as string | undefined

    console.log('Portfolio ID:', portfolioId || 'all portfolios')

    const worker = getMarketDataWorker()
    console.log('Worker obtained successfully')

    if (portfolioId) {
      // Update specific portfolio
      console.log(`Starting update for portfolio ${portfolioId}`)
      await worker.updateSpecificHoldings(portfolioId)
      console.log(`Update completed for portfolio ${portfolioId}`)
      return {
        success: true,
        message: `Market data updated for portfolio ${portfolioId}`,
        portfolioId
      }
    } else {
      // Update all holdings
      console.log('Starting update for all holdings')
      await worker.updateAllHoldings()
      console.log('Update completed for all holdings')
      return {
        success: true,
        message: 'Market data updated for all holdings'
      }
    }
  } catch (error) {
    console.error('Error updating market data:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update market data',
      data: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

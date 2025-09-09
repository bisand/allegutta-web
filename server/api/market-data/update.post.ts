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
      // V2 worker only supports updating all market data, not portfolio-specific
      console.log(`Updating all market data (portfolio-specific updates not supported in V2)`)
      await worker.updateAllMarketData()
      console.log(`Market data update completed`)
      return {
        success: true,
        message: `Market data updated for all records (requested for portfolio ${portfolioId})`,
        portfolioId
      }
    } else {
      // Update all market data
      console.log('Starting update for all market data')
      await worker.updateAllMarketData()
      console.log('Update completed for all market data')
      return {
        success: true,
        message: 'Market data updated for all records'
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

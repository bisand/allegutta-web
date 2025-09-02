import { getMarketDataWorker } from '../../lib/globalMarketDataWorker'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const portfolioId = query.portfolioId as string | undefined

    const worker = getMarketDataWorker()

    if (portfolioId) {
      // Update specific portfolio
      await worker.updateSpecificHoldings(portfolioId)
      return {
        success: true,
        message: `Market data updated for portfolio ${portfolioId}`,
        portfolioId
      }
    } else {
      // Update all holdings
      await worker.updateAllHoldings()
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

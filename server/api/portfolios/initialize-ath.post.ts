/**
 * ATH Initialization API endpoint
 */

export default defineEventHandler(async () => {
  try {
    const { initializeAthForExistingPortfolios } = await import('../../lib/athTracker')
    
    await initializeAthForExistingPortfolios()
    
    return {
      success: true,
      message: 'ATH initialization completed for existing portfolios'
    }
  } catch (error) {
    console.error('Error initializing ATH:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to initialize ATH values'
    })
  }
})

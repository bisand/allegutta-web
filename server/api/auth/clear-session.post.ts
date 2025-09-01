import { getKindeSessionManager } from '../../lib/kinde-server'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  try {
    const sessionManager = getKindeSessionManager(event)
    await sessionManager.destroySession()
    
    return { success: true, message: 'Session cleared' }
  } catch (error) {
    console.error('Clear session error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to clear session'
    })
  }
})

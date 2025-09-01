import { kindeClient, getKindeSessionManager } from '../../lib/kinde-server'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  try {
    const sessionManager = getKindeSessionManager(event)
    const registerUrl = await kindeClient.register(sessionManager)
    
    // Redirect to Kinde registration
    await sendRedirect(event, registerUrl.toString())
  } catch (error) {
    console.error('Register error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Registration failed'
    })
  }
})

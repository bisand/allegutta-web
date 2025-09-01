export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const query = getQuery(event)
  const redirectTo = query.redirect as string || '/portfolio'
  
  // Store redirect URL in cookie for after login
  setCookie(event, 'redirect-after-login', redirectTo, {
    httpOnly: true,
    secure: !useRuntimeConfig().public.baseUrl?.includes('localhost'),
    sameSite: 'lax',
    maxAge: 60 * 5 // 5 minutes
  })

  // For development mode, redirect to a simple mock login
  const config = useRuntimeConfig()
  if (config.public.baseUrl?.includes('localhost')) {
    return sendRedirect(event, '/api/auth/mock-login')
  }

  // In production, this would redirect to Kinde login
  // For now, redirect to a placeholder
  return sendRedirect(event, '/api/auth/kinde-login')
})

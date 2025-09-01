export default defineNuxtRouteMiddleware((_to, _from) => {
  const { loggedIn, canManagePortfolios } = useAppAuth()
  
  // Check if user is logged in
  if (!loggedIn.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required. Please log in to access this page.'
    })
  }
  
  // Check if user has admin permissions
  if (!canManagePortfolios.value) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied. Admin permissions required.'
    })
  }
})

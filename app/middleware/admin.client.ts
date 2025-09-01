export default defineNuxtRouteMiddleware(async (_to, _from) => {
  const { loggedIn, canManagePortfolios, initialize, user } = useAppAuth()
  
  // Ensure auth state is initialized
  await initialize()
  
  // Debug logging
  console.log('Admin middleware - Auth state:', {
    loggedIn: loggedIn.value,
    canManagePortfolios: canManagePortfolios.value,
    userRoles: user.value?.roles,
    userPermissions: user.value?.permissions,
    user: user.value
  })
  
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

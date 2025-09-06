export default defineNuxtRouteMiddleware(async (to, _from) => {
  // Skip auth check for auth callback page
  if (to.path === '/auth/callback') {
    return
  }

  const { loggedIn, initialize } = useAuthorization()

  // Ensure auth state is initialized
  await initialize()

  // Check if user is logged in
  if (!loggedIn.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required. Please log in to access this page.'
    })
  }
})

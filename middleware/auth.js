export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated } = useKindeAuth()
  
  if (!isAuthenticated.value) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }
})

// Server-side middleware for authentication
export default defineNuxtRouteMiddleware((to) => {
  // Skip auth check for auth callback page
  if (to.path === '/auth/callback') {
    return
  }
  
  // For now, let the client-side handle auth redirects
  // In a production app, you'd verify the JWT token here
  return
})

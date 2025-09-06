export default defineNuxtPlugin(async () => {
  // Only run on client side
  if (import.meta.server) return

  const auth = useAuthorization()
  
  // Initialize auth state on app load
  await auth.initialize()
})

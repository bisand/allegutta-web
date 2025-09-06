export default defineNuxtPlugin(async () => {
  // Initialize auth as soon as possible on client-side
  const { initialize } = useAuthorization()
  
  // Run auth initialization in parallel with other app setup
  await initialize()
})

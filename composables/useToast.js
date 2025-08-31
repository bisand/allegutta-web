// Mock toast composable for now - will use actual Nuxt UI toast
export const useToast = () => {
  const add = (notification) => {
    console.log('Toast notification:', notification)
    // This would show actual toast notifications with Nuxt UI
  }
  
  return {
    add
  }
}

// Mock Kinde Auth for now - will be replaced with actual Kinde implementation
export const useKindeAuth = () => {
  const isAuthenticated = ref(false) // This would come from Kinde
  const user = ref(null) // This would come from Kinde
  
  const login = () => {
    console.log('Login would redirect to Kinde')
  }
  
  const logout = () => {
    console.log('Logout would clear Kinde session')
  }
  
  const register = () => {
    console.log('Register would redirect to Kinde')
  }
  
  return {
    isAuthenticated: readonly(isAuthenticated),
    user: readonly(user),
    login,
    logout,
    register
  }
}

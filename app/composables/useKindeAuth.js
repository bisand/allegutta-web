import { createKindeClient } from '@kinde-oss/kinde-auth-pkce-js'

let kindeClient = null

export const useKindeAuth = () => {
  const config = useRuntimeConfig()
  
  // Initialize Kinde client if not already done
  if (!kindeClient && import.meta.client) {
    kindeClient = createKindeClient({
      domain: config.public.kindeDomain || 'https://your-domain.kinde.com',
      clientId: config.public.kindeClientId || 'your-client-id',
      redirectUri: config.public.kindeRedirectUrl || `${config.public.baseUrl}/auth/callback`,
      logoutUri: config.public.kindeLogoutRedirectUrl || config.public.baseUrl
    })
  }

  // Reactive state
  const isAuthenticated = ref(false)
  const user = ref(null)
  const token = ref(null)
  const isLoading = ref(true)

  // Check authentication status
  const checkAuth = async () => {
    if (!kindeClient) {
      // Development mode - auto authenticate test user
      if (config.public.baseUrl?.includes('localhost')) {
        isAuthenticated.value = true
        user.value = {
          id: 'test_user_1',
          email: 'test@example.com',
          given_name: 'Test',
          family_name: 'User'
        }
        token.value = 'dev_token'
        isLoading.value = false
        return
      }
      return
    }
    
    try {
      isLoading.value = true
      const authenticated = await kindeClient.isAuthenticated()
      isAuthenticated.value = authenticated
      
      if (authenticated) {
        const userProfile = await kindeClient.getUserProfile()
        const accessToken = await kindeClient.getToken()
        
        user.value = userProfile
        token.value = accessToken
        
        // Store token in a cookie for server-side access
        const tokenCookie = useCookie('kinde-token', {
          default: () => null,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7 // 7 days
        })
        tokenCookie.value = accessToken
      } else {
        user.value = null
        token.value = null
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      isAuthenticated.value = false
      user.value = null
      token.value = null
    } finally {
      isLoading.value = false
    }
  }

  // Login function
  const login = async () => {
    if (!kindeClient) {
      console.error('Kinde client not initialized')
      return
    }
    
    try {
      await kindeClient.login()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  // Register function
  const register = async () => {
    if (!kindeClient) {
      console.error('Kinde client not initialized')
      return
    }
    
    try {
      await kindeClient.register()
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }

  // Logout function
  const logout = async () => {
    if (!kindeClient) {
      console.error('Kinde client not initialized')
      return
    }
    
    try {
      await kindeClient.logout()
      isAuthenticated.value = false
      user.value = null
      token.value = null
      
      // Clear token cookie
      const tokenCookie = useCookie('kinde-token')
      tokenCookie.value = null
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Initialize on client side
  onMounted(() => {
    if (import.meta.client) {
      checkAuth()
    }
  })

  return {
    isAuthenticated: readonly(isAuthenticated),
    user: readonly(user),
    token: readonly(token),
    isLoading: readonly(isLoading),
    login,
    register,
    logout,
    checkAuth
  }
}

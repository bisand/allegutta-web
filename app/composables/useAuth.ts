interface AuthUser {
  id: string
  kindeId: string
  email: string
  firstName: string | null
  lastName: string | null
  name: string
  picture: string | null
  avatar?: string
  roles: string[]
  permissions: string[]
  createdAt: Date
  updatedAt: Date
}

interface AuthComposableState {
  user: AuthUser | null
  loggedIn: boolean
  loading: boolean
}

export const useAppAuth = () => {
  const authState = useState<AuthComposableState>('auth', () => ({
    user: null,
    loggedIn: false,
    loading: true
  }))

  // Initialize auth state
  const initialize = async () => {
    try {
      authState.value.loading = true
      
      // Try to get user from auth token cookie
      const user = await $fetch<AuthUser>('/api/auth/me').catch(() => null)
      
      if (user) {
        authState.value.user = user
        authState.value.loggedIn = true
      } else {
        authState.value.user = null
        authState.value.loggedIn = false
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      authState.value.user = null
      authState.value.loggedIn = false
    } finally {
      authState.value.loading = false
    }
  }

  // Login with Kinde
  const login = async (redirectTo?: string) => {
    if (redirectTo) {
      // Store redirect URL for after login
      await navigateTo(`/api/auth/login?redirect=${encodeURIComponent(redirectTo)}`)
    } else {
      await navigateTo('/api/auth/login')
    }
  }

  // Logout
  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      authState.value.user = null
      authState.value.loggedIn = false
      await navigateTo('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Check if user has a specific role
  const hasRole = (role: string): boolean => {
    return authState.value.user?.roles?.includes(role) || false
  }

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role))
  }

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return authState.value.user?.permissions?.includes(permission) || false
  }

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }

  // Check if user is admin
  const isAdmin = computed(() => hasRole('admin'))

  // Check if user can manage portfolios
  const canManagePortfolios = computed(() => 
    hasAnyRole(['admin', 'portfolio_admin']) || 
    hasAnyPermission(['admin:manage', 'write:portfolios'])
  )

  return {
    // State
    user: readonly(computed(() => authState.value.user)),
    loggedIn: readonly(computed(() => authState.value.loggedIn)),
    loading: readonly(computed(() => authState.value.loading)),
    
    // Actions
    initialize,
    login,
    logout,
    
    // Role & Permission checks
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
    
    // Computed helpers
    isAdmin,
    canManagePortfolios
  }
}

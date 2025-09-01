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
      const { data: user } = await useFetch<AuthUser | null>('/api/auth/me')

      if (user.value) {
        authState.value.user = user.value
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

  // Register with Kinde
  const register = async (redirectTo?: string) => {
    if (redirectTo) {
      // Store redirect URL for after registration
      await navigateTo(`/api/auth/register?redirect=${encodeURIComponent(redirectTo)}`)
    } else {
      await navigateTo('/api/auth/register')
    }
  }

  // Logout
  const logout = async () => {
    try {
      const response = await $fetch<{ logoutUrl: string }>('/api/auth/logout', { method: 'POST' })
      authState.value.user = null
      authState.value.loggedIn = false

      // Redirect to Kinde logout URL
      if (response.logoutUrl) {
        await navigateTo(response.logoutUrl, { external: true })
      } else {
        await navigateTo('/')
      }
    } catch (error) {
      console.error('Logout failed:', error)
      // Fallback: clear state and redirect anyway
      authState.value.user = null
      authState.value.loggedIn = false
      await navigateTo('/')
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
    hasAnyPermission(['admin', 'portfolio_admin', 'admin:manage', 'write:portfolios'])
  )

  return {
    // State
    user: readonly(computed(() => authState.value.user)),
    loggedIn: readonly(computed(() => authState.value.loggedIn)),
    loading: readonly(computed(() => authState.value.loading)),

    // Actions
    initialize,
    login,
    register,
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

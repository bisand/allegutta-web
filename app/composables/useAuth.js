export const useAuth = () => {
  const { loggedIn, user, session, fetch: refreshSession, clear } = useUserSession()

  // Demo login function for development
  const login = async () => {
    await $fetch('/api/auth/demo-login', { method: 'POST' })
    await refreshSession()
    await navigateTo('/')
  }

  // Register function - same as login for demo
  const register = async () => {
    await $fetch('/api/auth/demo-login', { method: 'POST' })
    await refreshSession()
    await navigateTo('/')
  }

  // Logout function
  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clear()
    await navigateTo('/')
  }

  return {
    isAuthenticated: loggedIn,
    user: readonly(user),
    session: readonly(session),
    login,
    register,
    logout,
    refreshSession,
    clear
  }
}

// Backward compatibility alias
export const useKindeAuth = useAuth

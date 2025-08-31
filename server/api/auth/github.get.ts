export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user, tokens }) {
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.login,
        avatar: user.avatar_url,
        githubId: user.id,
        login: user.login
      },
      tokens,
      loggedInAt: Date.now()
    })
    
    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/?error=auth_failed')
  },
})

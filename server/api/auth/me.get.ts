export default defineEventHandler(async (event) => {
  try {
    // Check if we have Kinde context and authentication available
    if (!event.context.kinde) {
      return null
    }

    // Use the proper Kinde server-side API
    const profile = await event.context.kinde.getUser()
    
    // Return null if no profile is found instead of throwing
    if (!profile) {
      return null
    }

    const permissions = event.context.kinde.getPermissions ? (await event.context.kinde.getPermissions())?.permissions : []

    return {
      id: profile.id,
      kindeId: profile.id,
      email: profile.email || '',
      firstName: profile.given_name || null,
      lastName: profile.family_name || null,
      name: `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || profile.email || '',
      picture: profile.picture || null,
      // TODO: Add roles and permissions from your database or Kinde
      roles: [],
      permissions: permissions || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  } catch (error: unknown) {
    // Silently return null for authentication errors to avoid console spam
    // Only log non-authentication errors
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string
      if (!message.includes('authentication credential') && !message.includes('Not authenticated')) {
        console.error('Error in /api/auth/me:', error)
      }
    }
    return null
  }
})


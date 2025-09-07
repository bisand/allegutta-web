export default defineEventHandler(async (event) => {
  try {
    // Use the proper Kinde server-side API
    const profile = await event.context.kinde.getUser()
    const permissions = event.context.kinde.getPermissions ? (await event.context.kinde.getPermissions())?.permissions : []

    // Return user data, or null if not authenticated
    if (!profile) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

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
    // Return null for unauthenticated users instead of throwing
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
      return null
    }
    console.error('Error in /api/auth/me:', error)
    return null
  }
})


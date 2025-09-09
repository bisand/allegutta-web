import { getOptionalAuth } from '../../lib/auth'

export default defineEventHandler(async (event) => {
  try {
    // Use the auth helper that handles both dev and production modes
    const auth = await getOptionalAuth(event)

    if (!auth) {
      return null
    }

    const { kindeUser, dbUser } = auth

    // Get permissions from Kinde (only in production mode)
    let permissions: string[] = []
    let roles: string[] = []
    
    if (process.env.NUXT_DEV_AUTH === 'true') {
      // In dev mode, give the test user admin permissions
      roles = ['admin']
      permissions = ['write:portfolio', 'read:portfolio']
    } else if (event.context.kinde?.getPermissions) {
      permissions = (await event.context.kinde.getPermissions())?.permissions || []
      // TODO: Get roles from Kinde or database
    }

    return {
      id: dbUser.id,
      kindeId: kindeUser.id,
      email: kindeUser.email || '',
      firstName: kindeUser.given_name || null,
      lastName: kindeUser.family_name || null,
      name: `${kindeUser.given_name || ''} ${kindeUser.family_name || ''}`.trim() || kindeUser.email || '',
      picture: kindeUser.picture || null,
      roles: roles,
      permissions: permissions,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
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


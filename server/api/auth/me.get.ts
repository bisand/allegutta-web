import { getOptionalAuth } from '../../lib/auth'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  try {
    const user = await getOptionalAuth(event)

    // Return user data with roles and permissions, or null if not authenticated
    if (!user) {
      return null
    }

    return {
      id: user.id,
      kindeId: user.kindeId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      picture: user.picture,
      avatar: user.avatar,
      roles: user.rolesList,
      permissions: user.permissionsList,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  } catch (error: unknown) {
    // Return null for unauthenticated users instead of throwing
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
      return null
    }
    throw error
  }
})

import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import prisma from './prisma'
import { getKindeUser, isKindeAuthenticated, getKindePermissions } from './kinde-server'

interface KindeUser {
  id: string
  email: string
  given_name?: string
  family_name?: string
  picture?: string
}

interface User {
  id: string
  kindeId: string
  email: string
  firstName: string | null
  lastName: string | null
  picture: string | null
  roles: string // JSON array
  permissions: string // JSON array
  createdAt: Date
  updatedAt: Date
}

interface AuthUser extends User {
  name: string
  avatar?: string
  rolesList: string[]
  permissionsList: string[]
}

// Optional auth - returns user if authenticated, null if not
export async function getOptionalAuth(event: H3Event): Promise<AuthUser | null> {
  const config = useRuntimeConfig()
  
  // Check for JWT token in cookie first
  const tokenFromCookie = getCookie(event, 'auth-token')
  
  // Then check Authorization header
  const authHeader = getHeader(event, 'authorization')
  
  const token = tokenFromCookie || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null)
  
  // If we have a token, try to authenticate with it
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { 
        sub: string
        email: string
        roles?: string[]
        permissions?: string[]
      }
      
      const user = await prisma.user.findUnique({
        where: { kindeId: payload.sub }
      })

      if (user) {
        return {
          ...user,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          avatar: user.picture || undefined,
          rolesList: JSON.parse(user.roles || '[]'),
          permissionsList: JSON.parse(user.permissions || '[]')
        }
      }
    } catch (error) {
      console.error('Invalid JWT token:', error)
      // Clear invalid token
      deleteCookie(event, 'auth-token')
    }
  }

  // Fallback: Try Kinde TypeScript SDK authentication
  try {
    const isAuthenticated = await isKindeAuthenticated(event)
    if (isAuthenticated) {
      const kindeUser = await getKindeUser(event)
      if (kindeUser) {
        // Find or create user in database
        const user = await getUserFromKinde({
          id: kindeUser.id,
          email: kindeUser.email,
          given_name: kindeUser.given_name,
          family_name: kindeUser.family_name,
          picture: kindeUser.picture || undefined
        }, event)
        return user
      }
    }
  } catch (error) {
    console.error('Kinde authentication check failed:', error)
  }

  return null
}

export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getOptionalAuth(event)
  
  if (user) {
    return user
  }

  throw createError({
    statusCode: 401,
    statusMessage: 'Authentication required'
  })
}

export async function getUserFromKinde(kindeUser: KindeUser, event?: H3Event): Promise<AuthUser> {
  // Find or create user in our database
  let user = await prisma.users.findUnique({
    where: { kindeId: kindeUser.id }
  })

  let permissions: string[] = []
  let roles: string[] = []
  
  // Add admin role/permissions for specific emails (for testing)
  const adminEmails = ['test@example.com', 'admin@allegutta.com']
  if (adminEmails.includes(kindeUser.email)) {
    roles = ['admin']
    permissions = ['admin:manage', 'write:portfolios', 'read:portfolios']
  }
  
  // Try to get permissions from Kinde if we have an event
  if (event) {
    try {
      const kindePermissions = await getKindePermissions(event)
      if (kindePermissions && kindePermissions.permissions) {
        const kindePerms = kindePermissions.permissions.map((p: { key?: string; name?: string } | string) => 
          typeof p === 'string' ? p : (p.key || p.name || '')
        ).filter(Boolean)
        permissions = [...new Set([...permissions, ...kindePerms])] // Merge and dedupe
      }
    } catch (error) {
      console.error('Failed to get permissions from Kinde:', error)
    }
  }

  if (!user) {
    user = await prisma.users.create({
      data: {
        kindeId: kindeUser.id,
        email: kindeUser.email,
        firstName: kindeUser.given_name,
        lastName: kindeUser.family_name,
        picture: kindeUser.picture,
        roles: JSON.stringify(roles),
        permissions: JSON.stringify(permissions)
      }
    })

    // Create a default portfolio for new users
    await prisma.portfolios.create({
      data: {
        name: 'My Portfolio',
        description: 'Default portfolio',
        userId: user.id,
        isDefault: true
      }
    })
  } else {
    // Update existing user's permissions and roles on login
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        roles: JSON.stringify(roles),
        permissions: JSON.stringify(permissions)
      }
    })
  }

  return {
    ...user,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    avatar: user.picture || undefined,
    rolesList: JSON.parse(user.roles || '[]'),
    permissionsList: JSON.parse(user.permissions || '[]')
  }
}

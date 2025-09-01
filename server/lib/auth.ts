import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import prisma from './prisma'

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

export async function requireAuth(event: H3Event): Promise<AuthUser> {
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
  
  // Development mode fallback - use test user only if no token was provided
  if (config.public.baseUrl?.includes('localhost') && !token) {
    const user = await prisma.user.findUnique({
      where: { kindeId: 'test_user_1' }
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
  }

  throw createError({
    statusCode: 401,
    statusMessage: 'Authentication required'
  })
}

export async function getUserFromKinde(kindeUser: KindeUser): Promise<AuthUser> {
  // Find or create user in our database
  let user = await prisma.user.findUnique({
    where: { kindeId: kindeUser.id }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        kindeId: kindeUser.id,
        email: kindeUser.email,
        firstName: kindeUser.given_name,
        lastName: kindeUser.family_name,
        picture: kindeUser.picture,
        roles: JSON.stringify([]), // Default to empty roles
        permissions: JSON.stringify([]) // Default to empty permissions
      }
    })

    // Create a default portfolio for new users
    await prisma.portfolio.create({
      data: {
        name: 'My Portfolio',
        description: 'Default portfolio',
        userId: user.id,
        isDefault: true
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

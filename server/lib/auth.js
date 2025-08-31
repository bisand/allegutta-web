import jwt from 'jsonwebtoken'
import prisma from './prisma.js'

export async function requireAuth(event) {
  const config = useRuntimeConfig()
  
  // Development mode - use test user
  if (config.public.baseUrl?.includes('localhost')) {
    const user = await prisma.user.findUnique({
      where: { kindeId: 'test_user_1' }
    })
    
    if (user) {
      return user
    }
  }

  const authHeader = getHeader(event, 'authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  try {
    const payload = jwt.verify(token, useRuntimeConfig().jwtSecret)
    const user = await prisma.user.findUnique({
      where: { kindeId: payload.sub }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User not found'
      })
    }

    return user
  } catch {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired token'
    })
  }
}

export async function getUserFromKinde(kindeUser) {
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
        picture: kindeUser.picture
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

  return user
}

import prisma from './prisma'
import type { H3Event } from 'h3'

/**
 * Get or create a database user from a Kinde user
 * This ensures the user exists in our local database and returns the database user ID
 */
export async function getRequiredAuth(event: H3Event) {
  // Check if dev auth mode is enabled
  if (process.env.NUXT_DEV_AUTH === 'true') {
    console.log('🔧 Dev auth mode enabled - using test user')
    
    // Return the existing test user from the database
    const testUser = await prisma.users.findFirst({
      where: { email: 'andre@biseth.net' }
    })
    
    if (!testUser) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Test user not found in dev mode'
      })
    }
    
    return { 
      kindeUser: { 
        id: testUser.kindeId,
        email: testUser.email,
        given_name: testUser.firstName,
        family_name: testUser.lastName,
        picture: testUser.picture 
      }, 
      dbUser: testUser 
    }
  }
  
  const user = await event.context.kinde.getUser()
  
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  // Ensure the user exists in our database
  const dbUser = await prisma.users.upsert({
    where: { kindeId: user.id },
    update: {
      email: user.email || '',
      firstName: user.given_name || null,
      lastName: user.family_name || null,
      picture: user.picture || null,
      updatedAt: new Date()
    },
    create: {
      id: crypto.randomUUID(),
      kindeId: user.id,
      email: user.email || '',
      firstName: user.given_name || null,
      lastName: user.family_name || null,
      picture: user.picture || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  return { kindeUser: user, dbUser }
}

/**
 * Get a database user from a Kinde user (for read-only operations)
 * This finds an existing user in our local database
 */
export async function getOptionalAuth(event: H3Event) {
  // Check if dev auth mode is enabled
  if (process.env.NUXT_DEV_AUTH === 'true') {
    console.log('🔧 Dev auth mode enabled - using test user')
    
    // Return the existing test user from the database
    const testUser = await prisma.users.findFirst({
      where: { email: 'andre@biseth.net' }
    })
    
    if (!testUser) {
      return null
    }
    
    return { 
      kindeUser: { 
        id: testUser.kindeId,
        email: testUser.email,
        given_name: testUser.firstName,
        family_name: testUser.lastName,
        picture: testUser.picture 
      }, 
      dbUser: testUser 
    }
  }
  
  const user = await event.context.kinde.getUser()
  
  if (!user) {
    return null
  }

  // Find the user in our database
  const dbUser = await prisma.users.findUnique({
    where: { kindeId: user.id }
  })

  return dbUser ? { kindeUser: user, dbUser } : null
}

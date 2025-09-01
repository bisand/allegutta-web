import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const config = useRuntimeConfig()
  
  // Only allow in development mode
  if (!config.public.baseUrl?.includes('localhost')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Test login only available in development'
    })
  }

  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { kindeId: 'test_user_1' }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Test user not found'
      })
    }

    // Create JWT token for test user
    const token = jwt.sign(
      {
        sub: user.kindeId,
        email: user.email,
        roles: JSON.parse(user.roles || '[]'),
        permissions: JSON.parse(user.permissions || '[]')
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    )

    // Set auth cookie
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: false, // Allow over HTTP in development
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return {
      success: true,
      message: 'Logged in as test admin user',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        roles: JSON.parse(user.roles || '[]'),
        permissions: JSON.parse(user.permissions || '[]')
      }
    }
  } catch (error) {
    console.error('Test login error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Test login failed'
    })
  }
})

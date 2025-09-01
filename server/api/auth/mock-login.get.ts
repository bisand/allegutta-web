import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const config = useRuntimeConfig()
  
  // Only allow in development
  if (!config.public.baseUrl?.includes('localhost')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Mock login only available in development'
    })
  }

  try {
    // Find or create test user with admin permissions
    let user = await prisma.user.findUnique({
      where: { kindeId: 'test_user_1' }
    })

    if (!user) {
      // Create test user with admin permissions
      user = await prisma.user.create({
        data: {
          kindeId: 'test_user_1',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          picture: null,
          roles: JSON.stringify(['admin', 'portfolio_admin']),
          permissions: JSON.stringify(['admin:manage', 'read:portfolios', 'write:portfolios'])
        }
      })

      // Create a default portfolio for the test user
      await prisma.portfolio.create({
        data: {
          name: 'Test Portfolio',
          description: 'Test portfolio for development',
          userId: user.id,
          isDefault: true
        }
      })
    } else {
      // Update test user to ensure they have admin permissions
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          roles: JSON.stringify(['admin', 'portfolio_admin']),
          permissions: JSON.stringify(['admin:manage', 'read:portfolios', 'write:portfolios']),
          updatedAt: new Date()
        }
      })
    }

    // Create a JWT token
    const token = jwt.sign(
      { 
        sub: user.kindeId, 
        email: user.email,
        roles: ['admin', 'portfolio_admin'],
        permissions: ['admin:manage', 'read:portfolios', 'write:portfolios']
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    )

    // Set the JWT token as an HTTP-only cookie
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: false, // Development only
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Get redirect URL
    const redirectTo = getCookie(event, 'redirect-after-login') || '/portfolio'
    deleteCookie(event, 'redirect-after-login')
    
    return sendRedirect(event, redirectTo)
    
  } catch (error) {
    console.error('Mock login error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Mock login failed'
    })
  }
})

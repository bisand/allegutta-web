import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma'

interface KindeRole {
  key?: string
  name?: string
  id?: string
}

interface KindePermission {
  key?: string
  name?: string
  id?: string
}

interface KindePermissions {
  permissions?: KindePermission[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  try {
    // For now, we'll implement a simpler approach using the Nuxt Kinde module
    // The @nuxtjs/kinde module should handle the OAuth flow
    
    // This is a placeholder that shows how to extract user info
    // The actual implementation will depend on how @nuxtjs/kinde provides the data
    
    const query = getQuery(event)
    const code = query.code as string
    
    if (!code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Authorization code not found'
      })
    }

    // TODO: Use the @nuxtjs/kinde module's built-in functions to get user data
    // For now, we'll create a basic implementation
    
    // Mock user data structure - replace with actual Kinde data extraction
    const mockUser = {
      id: 'kinde_user_123',
      email: 'user@example.com',
      given_name: 'John',
      family_name: 'Doe',
      picture: null
    }
    
    const mockRoles: KindeRole[] = [
      { key: 'admin', name: 'Administrator' },
      { key: 'portfolio_admin', name: 'Portfolio Administrator' }
    ]
    
    const mockPermissions: KindePermissions = {
      permissions: [
        { key: 'read:portfolios', name: 'Read Portfolios' },
        { key: 'write:portfolios', name: 'Write Portfolios' },
        { key: 'admin:manage', name: 'Admin Management' }
      ]
    }

    // Extract role names and permission keys
    const roleNames = mockRoles.map((role: KindeRole) => role.key || role.name).filter(Boolean) as string[]
    const permissionKeys = mockPermissions.permissions?.map((perm: KindePermission) => perm.key || perm.name).filter(Boolean) as string[] || []

    // Find or create user in our database
    let dbUser = await prisma.user.findUnique({
      where: { kindeId: mockUser.id }
    })

    if (!dbUser) {
      // Create new user with roles and permissions
      dbUser = await prisma.user.create({
        data: {
          kindeId: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.given_name,
          lastName: mockUser.family_name,
          picture: mockUser.picture,
          roles: JSON.stringify(roleNames),
          permissions: JSON.stringify(permissionKeys)
        }
      })

      // Create a default portfolio for new users
      await prisma.portfolio.create({
        data: {
          name: 'My Portfolio',
          description: 'Default portfolio',
          userId: dbUser.id,
          isDefault: true
        }
      })
    } else {
      // Update existing user with latest roles and permissions
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          firstName: mockUser.given_name,
          lastName: mockUser.family_name,
          picture: mockUser.picture,
          roles: JSON.stringify(roleNames),
          permissions: JSON.stringify(permissionKeys),
          updatedAt: new Date()
        }
      })
    }

    // Create a JWT token for our application
    const token = jwt.sign(
      { 
        sub: mockUser.id, 
        email: mockUser.email,
        roles: roleNames,
        permissions: permissionKeys
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    )

    // Set the JWT token as an HTTP-only cookie
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: !config.public.baseUrl?.includes('localhost'),
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    // Redirect to the portfolio page or intended destination
    const redirectTo = getCookie(event, 'redirect-after-login') || '/portfolio'
    deleteCookie(event, 'redirect-after-login')
    
    return sendRedirect(event, redirectTo)
    
  } catch (error) {
    console.error('Kinde callback error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication failed'
    })
  }
})

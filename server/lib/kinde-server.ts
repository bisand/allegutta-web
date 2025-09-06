import { createKindeServerClient, GrantType, type SessionManager } from '@kinde-oss/kinde-typescript-sdk'
import type { H3Event } from 'h3'

// Create Kinde server client
function createKindeClient() {
  
  console.log('Creating Kinde client with config:', {
    authDomain: process.env.NUXT_KINDE_AUTH_DOMAIN,
    clientId: process.env.NUXT_KINDE_CLIENT_ID,
    clientSecret: process.env.NUXT_KINDE_CLIENT_SECRET ? '[REDACTED]' : 'MISSING',
    redirectURL: process.env.NUXT_KINDE_REDIRECT_URL,
    logoutRedirectURL: process.env.NUXT_KINDE_LOGOUT_REDIRECT_URL,
  })

  if (!process.env.NUXT_KINDE_AUTH_DOMAIN || !process.env.NUXT_KINDE_CLIENT_ID || !process.env.NUXT_KINDE_CLIENT_SECRET || !process.env.NUXT_KINDE_REDIRECT_URL) {
    throw new Error(`Missing required Kinde configuration: domain=${!!process.env.NUXT_KINDE_AUTH_DOMAIN}, clientId=${!!process.env.NUXT_KINDE_CLIENT_ID}, secret=${!!process.env.NUXT_KINDE_CLIENT_SECRET}, redirectURL=${!!process.env.NUXT_KINDE_REDIRECT_URL}`)
  }
  
  return createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
    authDomain: process.env.NUXT_KINDE_AUTH_DOMAIN,
    clientId: process.env.NUXT_KINDE_CLIENT_ID,
    clientSecret: process.env.NUXT_KINDE_CLIENT_SECRET,
    redirectURL: process.env.NUXT_KINDE_REDIRECT_URL,
    logoutRedirectURL: process.env.NUXT_KINDE_LOGOUT_REDIRECT_URL,
  })
}

// Lazy client creation
let _kindeClient: ReturnType<typeof createKindeClient> | null = null

function getKindeClient() {
  if (!_kindeClient) {
    _kindeClient = createKindeClient()
  }
  return _kindeClient
}

// Export the lazy client getter
export const kindeClient = new Proxy({} as ReturnType<typeof createKindeClient>, {
  get(target, prop) {
    return getKindeClient()[prop as keyof ReturnType<typeof createKindeClient>]
  }
})

// Session manager implementation using encrypted cookies
class H3SessionManager implements SessionManager {
  private event: H3Event

  constructor(event: H3Event) {
    this.event = event
  }

  async getSessionItem(key: string): Promise<unknown> {
    const value = getCookie(this.event, `kinde_${key}`)
    if (value === undefined || value === null) {
      return undefined
    }
    
    // Handle both string and already parsed values
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch {
        // If it's not valid JSON, return as-is (might be a plain string)
        return value
      }
    }
    
    return value
  }

  async setSessionItem(key: string, value: unknown): Promise<void> {
    // Store as JSON string for complex objects, plain string for simple values
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value)
    
    setCookie(this.event, `kinde_${key}`, serializedValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  }

  async removeSessionItem(key: string): Promise<void> {
    deleteCookie(this.event, `kinde_${key}`)
  }

  async destroySession(): Promise<void> {
    // Remove all Kinde-related cookies
    const cookies = parseCookies(this.event)
    for (const cookieName in cookies) {
      if (cookieName.startsWith('kinde_')) {
        deleteCookie(this.event, cookieName)
      }
    }
  }
}

// Helper function to get session manager for an event
export function getKindeSessionManager(event: H3Event): SessionManager {
  return new H3SessionManager(event)
}

// Helper functions for common operations
export async function isKindeAuthenticated(event: H3Event): Promise<boolean> {
  const sessionManager = getKindeSessionManager(event)
  try {
    return await kindeClient.isAuthenticated(sessionManager)
  } catch (error) {
    console.error('Error checking Kinde authentication:', error)
    return false
  }
}

export async function getKindeUser(event: H3Event) {
  const sessionManager = getKindeSessionManager(event)
  try {
    const isAuth = await kindeClient.isAuthenticated(sessionManager)
    if (!isAuth) return null
    
    return await kindeClient.getUserProfile(sessionManager)
  } catch (error) {
    console.error('Error getting Kinde user:', error)
    return null
  }
}

export async function getKindePermissions(event: H3Event) {
  const sessionManager = getKindeSessionManager(event)
  try {
    const isAuth = await kindeClient.isAuthenticated(sessionManager)
    if (!isAuth) return null
    
    return await kindeClient.getPermissions(sessionManager)
  } catch (error) {
    console.error('Error getting Kinde permissions:', error)
    return null
  }
}

export async function getKindeUserOrganizations(event: H3Event) {
  const sessionManager = getKindeSessionManager(event)
  try {
    const isAuth = await kindeClient.isAuthenticated(sessionManager)
    if (!isAuth) return null
    
    return await kindeClient.getUserOrganizations(sessionManager)
  } catch (error) {
    console.error('Error getting Kinde user organizations:', error)
    return null
  }
}

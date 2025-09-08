# AlleGutta - Hybrid Kinde Authentication

This project uses a **hybrid Kinde authentication approach** combining the best of both client-side and server-side authentication.

## Architecture Overview

### Client-Side: @nuxtjs/kinde
- Provides client-side auth state management
- Handles UI components and composables
- Manages reactive authentication state
- Used by: `app/composables/useAuth.ts`, pages, middleware

### Server-Side: @kinde-oss/kinde-typescript-sdk
- Provides robust server-side authentication
- Handles OAuth flows and session management
- Validates tokens and manages permissions
- Used by: Server API routes, authentication middleware

## How It Works

### 1. Authentication Flow
```
User clicks login → /api/auth/login → Kinde OAuth → /api/auth/kinde_callback → /portfolio
```

### 2. Session Management
- **Session Storage**: Encrypted HTTP-only cookies (`kinde_*`)
- **Token Validation**: TypeScript SDK handles token verification
- **Fallback**: JWT tokens for backward compatibility

### 3. API Integration
- **Client calls**: `/api/auth/me` for user state
- **Server validation**: `requireAuth()` or `getOptionalAuth()` in API routes
- **Production Ready**: No test user auto-login, proper authentication required

## User Experience

### For Unauthenticated Users
- **Header**: Shows Sign In / Sign Up buttons
- **Portfolios Dropdown**: Shows login prompt with Sign In / Create Account options
- **Portfolio Pages**: Shows authentication required screen with login buttons
- **Mobile Menu**: Shows Account section with Sign In / Create Account options

### For Authenticated Users
- **Header**: Shows user avatar/name with dropdown menu
- **Portfolios Dropdown**: Shows user's portfolios and management options
- **User Menu**: Includes Portfolio, Settings, and Sign Out options

## Key Files

### Server-Side Authentication
- `server/lib/kinde-server.ts` - Kinde TypeScript SDK client and utilities
- `server/lib/auth.ts` - Enhanced auth helpers with Kinde fallback
- `server/api/auth/login.get.ts` - Login endpoint
- `server/api/auth/register.get.ts` - Registration endpoint  
- `server/api/auth/logout.post.ts` - Logout endpoint
- `server/api/auth/kinde_callback.get.ts` - OAuth callback handler

### Client-Side Authentication
- `app/composables/useAuth.ts` - Client auth state management
- `app/middleware/auth.ts` - Route protection
- `app/middleware/admin.ts` - Admin role protection

## Configuration

### Environment Variables
```env
# Kinde Configuration
KINDE_DOMAIN=https://your-subdomain.kinde.com
KINDE_CLIENT_ID=your_client_id
KINDE_CLIENT_SECRET=your_client_secret
KINDE_REDIRECT_URL=http://localhost:3000/api/auth/kinde_callback
KINDE_LOGOUT_REDIRECT_URL=http://localhost:3000
NUXT_KINDE_POST_LOGIN_REDIRECT_URL=http://localhost:3000/portfolio

# Legacy JWT (for backward compatibility)
JWT_SECRET=your_jwt_secret
```

### Nuxt Config
```typescript
modules: [
  '@nuxtjs/kinde' // Still used for client-side features
],

kinde: {
  redirectURL: process.env.KINDE_REDIRECT_URL,
  logoutRedirectURL: process.env.KINDE_LOGOUT_REDIRECT_URL,
  postLoginRedirectURL: process.env.NUXT_KINDE_POST_LOGIN_REDIRECT_URL
}
```

## Usage Examples

### In Server API Routes
```typescript
import { requireAuth } from '~/server/lib/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event) // Throws 401 if not authenticated
  // Handle authenticated request
})
```

### In Client Components
```vue
<script setup>
const { user, loggedIn, login, logout } = useAuthorization()

// Reactive authentication state
console.log(user.value) // Current user or null
console.log(loggedIn.value) // Boolean authentication status
</script>
```

### Authentication Methods
```typescript
const auth = useAuthorization()

// Login (redirects to Kinde)
await auth.login()
await auth.login('/redirect-after-login')

// Register (redirects to Kinde)
await auth.register()

// Logout (clears session and redirects)
await auth.logout()

// Permission checks
const canEdit = auth.hasPermission('edit:portfolios')
const isAdmin = auth.isAdmin.value
```

## Benefits of Hybrid Approach

✅ **Robust Server Authentication**: TypeScript SDK provides production-ready OAuth flows  
✅ **Rich Client Experience**: Nuxt module provides reactive auth state and composables  
✅ **Session Security**: HTTP-only encrypted cookies  
✅ **Clean UX**: Clear login prompts throughout the application  
✅ **Backward Compatible**: Existing JWT tokens still work  
✅ **Permission Support**: Built-in role and permission checking  
✅ **Organization Support**: Multi-tenant capabilities ready  

## Migration Notes

- Existing API routes continue to work with both JWT and Kinde session authentication
- Client-side auth composables remain unchanged
- New Kinde TypeScript SDK provides more reliable server-side authentication
- Session storage moved from JWT-only to secure Kinde session cookies
- **Removed**: Test user auto-login for cleaner production-ready authentication
- All unauthenticated users now see proper login prompts

## Next Steps

1. **Configure Kinde application** with proper callback URLs
2. **Set up environment variables** for production deployment
3. **Test the authentication flow** end-to-end
4. **Deploy with production environment variables**
5. **Optional**: Remove JWT fallback once fully migrated to Kinde sessions
6. **Optional**: Implement organization/multi-tenant features using Kinde SDK

import { kindeClient, getKindeSessionManager } from '../../lib/kinde-server'

export default defineEventHandler(async (event) => {
    if (getMethod(event) !== 'GET') {
        throw createError({
            statusCode: 405,
            statusMessage: 'Method not allowed'
        })
    }

    try {
        const sessionManager = getKindeSessionManager(event)
        const url = getRequestURL(event)

        console.log('Callback URL:', url.toString())
        console.log('Callback query params:', Object.fromEntries(url.searchParams.entries()))

        // Handle the callback from Kinde
        await kindeClient.handleRedirectToApp(sessionManager, url)

        // Get the post-login redirect URL from config
        const config = useRuntimeConfig()
        const redirectUrl = config.kinde?.postLoginRedirectURL || '/portfolio'

        console.log('Redirecting to:', redirectUrl)

        // Redirect to the configured post-login URL
        await sendRedirect(event, redirectUrl)
    } catch (error) {
        console.error('Callback error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Authentication callback failed'
        })
    }
})

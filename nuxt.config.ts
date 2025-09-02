// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  sourcemap: {
    server: true,
    client: true
  },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/kinde',
    '@nuxtjs/i18n'
  ],

  // Color mode configuration
  colorMode: {
    preference: 'system', // default value
    fallback: 'light', // fallback value if not system preference found
    classSuffix: '', // Use .dark instead of .dark-mode
  },

  // VueUse configuration to prevent conflicts
  vueuse: {
    ssrHandlers: true
  },

  // App configuration
  app: {
    head: {
      title: 'AlleGutta - Portfolio Management',
      meta: [
        { name: 'description', content: 'Personal portfolio and investment tracking application' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },

  // CSS framework
  css: ['~/assets/css/main.css'],

  // App source directory (Nuxt 4)
  srcDir: 'app/',

  // Runtime config
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
    databaseUrl: process.env.DATABASE_URL,
    // Kinde configuration
    kindeClientId: process.env.NUXT_KINDE_CLIENT_ID,
    kindeClientSecret: process.env.NUXT_KINDE_CLIENT_SECRET,
    kindeDomain: process.env.NUXT_KINDE_AUTH_DOMAIN,
    kindeRedirectUrl: process.env.NUXT_KINDE_REDIRECT_URL,
    kindeLogoutRedirectUrl: process.env.NUXT_KINDE_LOGOUT_REDIRECT_URL,
    public: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      kindeDomain: process.env.NUXT_KINDE_AUTH_DOMAIN
    }
  },

  // Kinde module configuration
  kinde: {
    // The module will automatically use NUXT_KINDE_* environment variables
    redirectURL: process.env.NUXT_KINDE_REDIRECT_URL || 'http://localhost:3000/api/auth/kinde_callback',
    logoutRedirectURL: process.env.NUXT_KINDE_LOGOUT_REDIRECT_URL || 'http://localhost:3000',
    postLoginRedirectURL: process.env.NUXT_KINDE_POST_LOGIN_REDIRECT_URL || 'http://localhost:3000/portfolio'
  },

  // i18n configuration
  i18n: {
    langDir: 'locales/',
    strategy: 'prefix_except_default', 
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true,
      fallbackLocale: 'no'
    },
    defaultLocale: 'no',
    locales: [
      { code: 'no', iso: 'nb-NO', name: 'Norsk', file: 'no.json' },
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' }
    ]
  }
})
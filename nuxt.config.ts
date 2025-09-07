// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  sourcemap: {
    server: true,
    client: true
  },

  modules: [
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
    databaseUrl: process.env.DATABASE_URL,
    registrationEnabled: process.env.REGISTRATION_ENABLED === 'true',
    public: {
      baseUrl: process.env.BASE_URL,
      registrationEnabled: process.env.REGISTRATION_ENABLED === 'true',
      kindeOrgCode: process.env.NUXT_KINDE_ORG_CODE
    }
  },

  // Kinde module configuration
  kinde: {
    // The module will automatically use NUXT_KINDE_* environment variables
    // clientId: process.env.NUXT_KINDE_CLIENT_ID,
    // clientSecret: process.env.NUXT_KINDE_CLIENT_SECRET,
    // authDomain: process.env.NUXT_KINDE_AUTH_DOMAIN,
    // redirectURL: process.env.NUXT_KINDE_REDIRECT_URL,
    // logoutRedirectURL: process.env.NUXT_KINDE_LOGOUT_REDIRECT_URL,
    // postLoginRedirectURL: process.env.NUXT_KINDE_POST_LOGIN_REDIRECT_URL,
    endpoints: {
      callback: '/api/auth/callback',
      login: '/api/auth/login',
      logout: '/api/auth/logout'
    }
  },

  // i18n configuration
  i18n: {
    langDir: '../i18n/locales/',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: 'no'
    },
    defaultLocale: 'no',
    locales: [
      { code: 'no', iso: 'nb-NO', name: 'Norsk', file: 'no.json' },
      { code: 'en', iso: 'en-US', name: 'English', file: 'en.json' }
    ]
  }
})
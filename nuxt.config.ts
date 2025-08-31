// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/content',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@pinia/nuxt'
  ],

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

  // Runtime config
  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET,
    databaseUrl: process.env.DATABASE_URL,
    kindeSecret: process.env.KINDE_CLIENT_SECRET,
    public: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
      kindeDomain: process.env.KINDE_DOMAIN,
      kindeClientId: process.env.KINDE_CLIENT_ID,
      kindeRedirectUrl: process.env.KINDE_REDIRECT_URL,
      kindeLogoutRedirectUrl: process.env.KINDE_LOGOUT_REDIRECT_URL
    }
  }
})
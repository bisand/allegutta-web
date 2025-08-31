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
    '@nuxtjs/kinde'
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
    public: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    }
  }
})
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: 'latest',
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
    '@nuxtjs/i18n',
    '@vite-pwa/nuxt'
  ],

  // Vite PWA configuration
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico,woff2}'],
      runtimeCaching: [{
        urlPattern: /^\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 // 24 hours
          }
        }
      }]
    },
    manifest: {
      name: 'AlleGutta Portfolio',
      short_name: 'AlleGutta',
      description: 'Personal portfolio and investment tracking application',
      theme_color: '#111827', // Match gray-900 (dark background)
      background_color: '#111827', // Match the dark theme background
      display: 'standalone',
      orientation: 'portrait-primary',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/icons/icon-72x72.png',
          sizes: '72x72',
          type: 'image/png'
        },
        {
          src: '/icons/icon-96x96.png',
          sizes: '96x96',
          type: 'image/png'
        },
        {
          src: '/icons/icon-128x128.png',
          sizes: '128x128',
          type: 'image/png'
        },
        {
          src: '/icons/icon-144x144.png',
          sizes: '144x144',
          type: 'image/png'
        },
        {
          src: '/icons/icon-152x152.png',
          sizes: '152x152',
          type: 'image/png'
        },
        {
          src: '/icons/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-384x384.png',
          sizes: '384x384',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/icons/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 20
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  },

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
        { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' },
        // PWA meta tags
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'dark-content' }, // New iOS 14.5+ value for dark text on white background
        { name: 'apple-mobile-web-app-title', content: 'AlleGutta Portfolio' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'theme-color', content: '#f9fafb' }, // Start with gray-50 (light theme), will be updated by JS
        { name: 'msapplication-TileColor', content: '#111827' }, // Use gray-900 for tiles
        { name: 'msapplication-tap-highlight', content: 'no' },
        { name: 'apple-touch-fullscreen', content: 'yes' },
        // Prevent zooming
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/icon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/icon-16x16.png' },
        { rel: 'mask-icon', href: '/icons/safari-pinned-tab.svg', color: '#111827' },
        // iOS splash screens
        { rel: 'apple-touch-startup-image', href: '/icons/apple-splash-2048-2732.png', media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/icons/apple-splash-1668-2224.png', media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/icons/apple-splash-1536-2048.png', media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/icons/apple-splash-1125-2436.png', media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/icons/apple-splash-1242-2208.png', media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/icons/apple-splash-750-1334.png', media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' },
        { rel: 'apple-touch-startup-image', href: '/icons/apple-splash-640-1136.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)' }
      ]
    }
  },

  // CSS framework
  css: ['~/assets/css/main.css'],

  // App source directory (Nuxt 4)
  srcDir: 'app/',

  // Runtime config
  runtimeConfig: {
    databaseUrl: process.env.NUXT_DATABASE_URL,
    enableMarketDataWorker: process.env.NUXT_ENABLE_MARKET_DATA_WORKER === 'true',
    marketDataWorkerInterval: parseInt(process.env.NUXT_MARKET_DATA_WORKER_INTERVAL || '15', 10),
    public: {
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
      registrationEnabled: process.env.NUXT_PUBLIC_REGISTRATION_ENABLED === 'true',
      kindeOrgCode: process.env.NUXT_PUBLIC_KINDE_ORG_CODE
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
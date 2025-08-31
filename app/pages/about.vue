<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <!-- Header -->
      <div class="text-center mb-16">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          About AlleGutta
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          A modern, secure, and user-friendly portfolio management application 
          built with cutting-edge web technologies.
        </p>
      </div>

      <!-- Story Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Our Story</h2>
        <div class="prose prose-lg dark:prose-invert max-w-none">
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            AlleGutta was born from the need for a simple yet powerful portfolio tracking solution. 
            As individual investors, we found existing tools either too complex or lacking the 
            features we needed to effectively manage our investments.
          </p>
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            This application represents a complete rebuild of our original Angular-based portfolio 
            tracker, now powered by Nuxt 4 for better performance, user experience, and modern 
            web capabilities including Progressive Web App (PWA) support.
          </p>
        </div>
      </div>

      <!-- Features Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">Key Features</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                <ChartBarIcon class="w-5 h-5 text-primary-500" />
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Portfolio Management
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                Create and manage multiple portfolios with detailed tracking of holdings and performance.
              </p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <BanknotesIcon class="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Transaction Tracking
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                Record buy/sell orders, dividends, stock splits, and other investment activities.
              </p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon class="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Secure Authentication
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                Enterprise-grade security powered by Kinde authentication with multi-factor support.
              </p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <DevicePhoneMobileIcon class="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Progressive Web App
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                Install on any device for a native app experience with offline capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Technology Stack -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">Technology Stack</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span class="text-green-600 font-bold text-lg">N</span>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">Nuxt 4</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Vue.js Framework</p>
          </div>

          <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span class="text-blue-600 font-bold text-lg">P</span>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">PostgreSQL</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Database</p>
          </div>

          <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span class="text-purple-600 font-bold text-lg">K</span>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">Kinde</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Authentication</p>
          </div>

          <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span class="text-gray-600 dark:text-gray-300 font-bold text-lg">P</span>
            </div>
            <h3 class="font-semibold text-gray-900 dark:text-white">Prisma</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">ORM</p>
          </div>
        </div>
      </div>

      <!-- Call to Action -->
      <div class="text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Ready to Get Started?
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          Join us and start managing your portfolio like a pro.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            v-if="!isAuthenticated"
            type="button"
            class="px-6 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            @click="register"
          >
            Create Account
          </button>
          <NuxtLink 
            v-else
            to="/portfolio"
            class="px-6 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors text-center"
          >
            Go to Portfolio
          </NuxtLink>
          <NuxtLink 
            to="/"
            class="px-6 py-3 text-lg font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-600 hover:bg-primary-50 dark:hover:bg-gray-600 rounded-lg transition-colors text-center"
          >
            Learn More
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  ChartBarIcon, 
  BanknotesIcon, 
  ShieldCheckIcon, 
  DevicePhoneMobileIcon 
} from '@heroicons/vue/24/outline'

const { isAuthenticated, register } = useKindeAuth()

useHead({
  title: 'About',
  meta: [
    { name: 'description', content: 'Learn about AlleGutta portfolio management application, its features, and technology stack.' }
  ]
})
</script>

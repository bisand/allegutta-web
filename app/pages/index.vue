<template>
  <div class="min-h-screen">
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div class="text-center">
          <h1 class="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {{ $t('homepage.welcomeTitle') }}
            <span class="text-primary-500">AlleGutta</span>
          </h1>
          <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {{ $t('homepage.subtitle') }}
          </p>
          
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <NuxtLink
              to="/portfolio"
              class="flex items-center px-8 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {{ $t('homepage.viewPortfolio') }}
              <ChartBarIcon class="ml-2 w-5 h-5" />
            </NuxtLink>
          </div>
        </div>
      </div>
      
      <!-- Decorative elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-32 w-80 h-80 bg-primary-200 dark:bg-primary-800 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div class="absolute -bottom-40 -left-32 w-80 h-80 bg-blue-200 dark:bg-blue-800 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-24 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {{ $t('homepage.featuresTitle') }}
          </h2>
          <p class="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {{ $t('homepage.featuresSubtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 hover:shadow-lg transition-shadow">
            <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-6">
              <ChartBarIcon class="w-6 h-6 text-primary-500" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('homepage.portfolioTracking') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-300">
              {{ $t('homepage.portfolioTrackingDesc') }}
            </p>
          </div>

          <!-- Feature 2 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 hover:shadow-lg transition-shadow">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-6">
              <BanknotesIcon class="w-6 h-6 text-green-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('homepage.transactionManagement') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-300">
              {{ $t('homepage.transactionManagementDesc') }}
            </p>
          </div>

          <!-- Feature 3 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 hover:shadow-lg transition-shadow">
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-6">
              <ShieldCheckIcon class="w-6 h-6 text-purple-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('homepage.secureAuth') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-300">
              {{ $t('homepage.secureAuthDesc') }}
            </p>
          </div>

          <!-- Feature 4 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 hover:shadow-lg transition-shadow">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-6">
              <DevicePhoneMobileIcon class="w-6 h-6 text-blue-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('homepage.progressiveWebApp') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-300">
              {{ $t('homepage.progressiveWebAppDesc') }}
            </p>
          </div>

          <!-- Feature 5 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 hover:shadow-lg transition-shadow">
            <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center mb-6">
              <MoonIcon class="w-6 h-6 text-yellow-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('homepage.darkMode') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-300">
              {{ $t('homepage.darkModeDesc') }}
            </p>
          </div>

          <!-- Feature 6 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 hover:shadow-lg transition-shadow">
            <div class="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-6">
              <PresentationChartLineIcon class="w-6 h-6 text-red-600" />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {{ $t('homepage.analytics') }}
            </h3>
            <p class="text-gray-600 dark:text-gray-300">
              {{ $t('homepage.analyticsDesc') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 bg-primary-600 dark:bg-primary-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">
          {{ $t('homepage.ctaTitle') }}
        </h2>
        <p class="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          {{ $t('homepage.ctaSubtitle') }}
        </p>
        
        <button 
          v-if="!loggedIn && isRegistrationEnabled"
          type="button"
          class="flex items-center mx-auto px-8 py-3 text-lg font-medium text-primary-600 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
          @click="() => register()"
        >
          {{ $t('homepage.createPortfolio') }}
          <ArrowRightIcon class="ml-2 w-5 h-5" />
        </button>
        
        <div v-if="!loggedIn && !isRegistrationEnabled" class="text-center">
          <p class="text-primary-100 mb-4">
            {{ $t('homepage.registrationDisabled') }}
          </p>
          <NuxtLink 
            to="/api/auth/login"
            external
            class="inline-flex items-center px-8 py-3 text-lg font-medium text-primary-600 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {{ $t('common.login') }}
            <ArrowRightIcon class="ml-2 w-5 h-5" />
          </NuxtLink>
        </div>
        
        <NuxtLink 
          v-else
          to="/portfolio"
          class="flex items-center mx-auto px-8 py-3 text-lg font-medium text-primary-600 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {{ $t('homepage.goToPortfolio') }}
          <ChartBarIcon class="ml-2 w-5 h-5" />
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRightIcon,
  ChartBarIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  MoonIcon,
  PresentationChartLineIcon
} from '@heroicons/vue/24/outline'

const { loggedIn, register, isRegistrationEnabled } = useAppAuth()

useHead({
  title: 'Home',
  meta: [
    { name: 'description', content: 'AlleGutta - Personal portfolio and investment tracking application' }
  ]
})
</script>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}
</style>

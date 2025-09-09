<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <!-- Header -->
      <div class="text-center mb-16">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {{ $t('about.pageTitle') }}
        </h1>
        <p class="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          {{ $t('about.pageDescription') }}
        </p>
      </div>

      <!-- Story Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ $t('about.ourStory') }}</h2>
        <div class="prose prose-lg dark:prose-invert max-w-none">
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {{ $t('about.storyParagraph1') }}
          </p>
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {{ $t('about.storyParagraph2') }}
          </p>
        </div>
      </div>

      <!-- Investment Club History -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ $t('about.clubHistory') }}</h2>
        <div class="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg p-8 mb-8">
          <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
            {{ $t('about.clubHistoryDesc') }}
          </p>
        </div>
        
        <!-- Investment Philosophy & Social Aspect Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-4">
                <ChartBarIcon class="w-5 h-5 text-green-600" />
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ $t('about.investmentPhilosophy') }}
              </h3>
            </div>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
              {{ $t('about.investmentPhilosophyDesc') }}
            </p>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
                <UsersIcon class="w-5 h-5 text-blue-600" />
              </div>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ $t('about.socialAspect') }}
              </h3>
            </div>
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">
              {{ $t('about.socialAspectDesc') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Governance Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ $t('about.governance') }}</h2>
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
          <p class="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {{ $t('about.governanceDesc') }}
          </p>
          <div class="flex items-center justify-center">
            <NuxtLink 
              to="/vedtekter"
              class="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-600 hover:bg-primary-50 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <DocumentTextIcon class="w-4 h-4 mr-2" />
              {{ $t('common.vedtekter') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Features Section -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">{{ $t('about.keyFeatures') }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                <ChartBarIcon class="w-5 h-5 text-primary-500" />
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {{ $t('about.portfolioManagementTitle') }}
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {{ $t('about.portfolioManagementDesc') }}
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
                {{ $t('about.transactionTrackingTitle') }}
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {{ $t('about.transactionTrackingDesc') }}
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
                {{ $t('about.secureAuthTitle') }}
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {{ $t('about.secureAuthDesc') }}
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
                {{ $t('about.pwaTitle') }}
              </h3>
              <p class="text-gray-600 dark:text-gray-300">
                {{ $t('about.pwaDesc') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Technology Stack -->
      <div class="mb-16">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-8">{{ $t('about.technologyStack') }}</h2>
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
          {{ $t('about.readyToStart') }}
        </h2>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          {{ $t('about.joinUs') }}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            v-if="!loggedIn && isRegistrationEnabled"
            type="button"
            class="px-6 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            @click="() => register()"
          >
            {{ $t('about.createAccount') }}
          </button>
          <NuxtLink 
            v-else
            to="/portfolio"
            class="px-6 py-3 text-lg font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors text-center"
          >
            {{ $t('about.goToPortfolio') }}
          </NuxtLink>
          <NuxtLink 
            to="/"
            class="px-6 py-3 text-lg font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-600 hover:bg-primary-50 dark:hover:bg-gray-600 rounded-lg transition-colors text-center"
          >
            {{ $t('about.learnMore') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  ChartBarIcon, 
  BanknotesIcon, 
  ShieldCheckIcon, 
  DevicePhoneMobileIcon,
  UsersIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

const { loggedIn, register, isRegistrationEnabled } = useAuthorization()
const { t } = useI18n()

useHead({
  title: () => t('about.pageTitle'),
  meta: [
    { name: 'description', content: () => t('about.pageDescription') }
  ]
})
</script>

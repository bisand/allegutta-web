<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Authentication check -->
    <div v-if="!loggedIn" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <LockClosedIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Required
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Please sign in to access your portfolio
        </p>
        <div class="space-x-4">
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            @click="() => login()"
          >
            Sign In
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            @click="() => register()"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-else-if="portfolioStore.loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading portfolios...</p>
      </div>
    </div>

    <!-- Portfolio selector -->
    <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Select a Portfolio
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Choose a portfolio to view or manage your investments
        </p>
      </div>

      <!-- User's portfolios -->
      <div v-if="portfolioStore.portfolios.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Portfolios</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="portfolio in portfolioStore.portfolios"
            :key="portfolio.id"
            :to="`/portfolio/${portfolio.id}`"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-2 border-transparent hover:border-primary-500"
          >
            <div class="flex items-center mb-4">
              <ChartBarIcon class="w-8 h-8 text-primary-500 mr-3" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ portfolio.name }}
                  <span v-if="portfolio.isDefault" class="text-sm text-primary-500 ml-2">(Default)</span>
                </h3>
                <p v-if="portfolio.description" class="text-sm text-gray-600 dark:text-gray-400">
                  {{ portfolio.description }}
                </p>
              </div>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Created {{ formatDate(portfolio.createdAt) }}
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Public portfolios -->
      <div v-if="portfolioStore.publicPortfolios.length > 0">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Public Portfolios</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="portfolio in portfolioStore.publicPortfolios"
            :key="portfolio.id"
            :to="`/portfolio/${portfolio.id}`"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-2 border-transparent hover:border-primary-500"
          >
            <div class="flex items-center mb-4">
              <ChartBarIcon class="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ portfolio.name }}
                  <span v-if="portfolio.isDefault" class="text-sm text-blue-500 ml-2">(Default)</span>
                </h3>
                <p v-if="portfolio.description" class="text-sm text-gray-600 dark:text-gray-400">
                  {{ portfolio.description }}
                </p>
              </div>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Public Portfolio
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- No portfolios -->
      <div v-if="portfolioStore.allPortfolios.length === 0" class="text-center py-12">
        <ChartBarIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Portfolios Available</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          There are no portfolios to display at the moment.
        </p>
        <div v-if="portfolioStore.canManagePortfolios" class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            As an admin, you can create portfolios for users to view.
          </p>
          <NuxtLink 
            to="/admin/portfolios" 
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            <PlusIcon class="w-4 h-4 mr-2" />
            Manage Portfolios
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  LockClosedIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'

const { loggedIn, login, register } = useAppAuth()
const portfolioStore = usePortfolioStore()

// Redirect to default portfolio if user has one and only one portfolio
watch(() => portfolioStore.portfolios, (portfolios) => {
  if (portfolios.length === 1 && portfolios[0]) {
    // Auto-redirect to the single portfolio
    navigateTo(`/portfolio/${portfolios[0].id}`)
  } else if (portfolios.length > 1) {
    // Check if there's a default portfolio
    const defaultPortfolio = portfolios.find(p => p.isDefault)
    if (defaultPortfolio) {
      // Could optionally auto-redirect to default portfolio
      // navigateTo(`/portfolio/${defaultPortfolio.id}`)
    }
  }
}, { immediate: true })

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

// Page meta
useHead({
  title: 'Portfolio Selection',
  meta: [
    { name: 'description', content: 'Select a portfolio to view your investments and track performance' }
  ]
})
</script>

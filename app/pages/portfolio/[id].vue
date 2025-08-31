<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading state -->
    <div v-if="portfolioStore.loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Loading portfolio...</p>
      </div>
    </div>

    <!-- Portfolio not found -->
    <div v-else-if="!currentPortfolio" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <ChartBarIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Portfolio Not Found
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          The requested portfolio doesn't exist or you don't have access to it.
        </p>
        <NuxtLink to="/" class="text-primary-500 hover:text-primary-600">
          Go back to home
        </NuxtLink>
      </div>
    </div>

    <!-- Portfolio content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {{ currentPortfolio.name }}
              <span v-if="currentPortfolio.isDefault" class="text-sm text-primary-500 ml-2">(Default)</span>
            </h1>
            <p v-if="currentPortfolio.description" class="text-gray-600 dark:text-gray-400 mb-2">
              {{ currentPortfolio.description }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-500">
              Portfolio ID: {{ currentPortfolio.id }}
            </p>
          </div>
          
          <div v-if="canEdit" class="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
            <button 
              type="button"
              class="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              :disabled="portfolioStore.loading"
              @click="refreshPrices"
            >
              <ArrowPathIcon class="w-4 h-4 mr-2" />
              Update Prices
            </button>
            <button 
              type="button"
              class="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              @click="showAddTransaction = true"
            >
              <PlusIcon class="w-4 h-4 mr-2" />
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      <!-- Portfolio Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <CurrencyDollarIcon class="w-8 h-8 text-green-500" />
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Value
                </dt>
                <dd class="text-lg font-semibold text-gray-900 dark:text-white">
                  ${{ formatCurrency(portfolioStore.totalValue) }}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <TrendingUpIcon class="w-8 h-8" :class="portfolioStore.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'" />
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Gain/Loss
                </dt>
                <dd class="text-lg font-semibold" :class="portfolioStore.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'">
                  ${{ formatCurrency(Math.abs(portfolioStore.totalGainLoss)) }}
                  ({{ portfolioStore.totalGainLossPercentage.toFixed(2) }}%)
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <ChartBarIcon class="w-8 h-8 text-blue-500" />
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Holdings
                </dt>
                <dd class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ portfolioStore.portfolioHoldings.length }} positions
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Holdings Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Holdings</h3>
        </div>
        <div class="overflow-x-auto">
          <table v-if="portfolioStore.portfolioHoldings.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Market Value</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gain/Loss</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="holding in portfolioStore.portfolioHoldings" :key="holding.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {{ holding.symbol }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ holding.quantity }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${{ formatCurrency(holding.avgPrice) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${{ formatCurrency(holding.currentPrice || holding.avgPrice) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${{ formatCurrency(holding.quantity * (holding.currentPrice || holding.avgPrice)) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="getGainLossColor(holding)">
                    ${{ formatCurrency(Math.abs(getHoldingGainLoss(holding))) }}
                    ({{ getHoldingGainLossPercentage(holding).toFixed(2) }}%)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="px-6 py-8 text-center">
            <ChartBarIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">No holdings found</p>
            <p v-if="canEdit" class="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Start by adding your first transaction
            </p>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
        </div>
        <div class="overflow-x-auto">
          <table v-if="portfolioStore.portfolioTransactions.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th v-if="canEdit" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="transaction in portfolioStore.portfolioTransactions.slice(0, 10)" :key="transaction.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(transaction.date) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {{ transaction.symbol }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span :class="transaction.type === 'BUY' ? 'text-green-600' : 'text-red-600'">
                    {{ transaction.type }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ transaction.quantity }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${{ formatCurrency(transaction.price) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${{ formatCurrency(transaction.quantity * transaction.price) }}
                </td>
                <td v-if="canEdit" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <button class="text-primary-600 hover:text-primary-500 mr-2">Edit</button>
                  <button class="text-red-600 hover:text-red-500">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="px-6 py-8 text-center">
            <ClockIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">No transactions found</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Transaction Modal would go here -->
    <!-- This would be the same modal component used in the current portfolio page -->
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  ArrowPathIcon,
  PlusIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const portfolioStore = usePortfolioStore()
const { loggedIn, user } = useAuth()

const showAddTransaction = ref(false)

// Get portfolio ID from route
const portfolioId = computed(() => route.params.id as string)

// Get current portfolio
const currentPortfolio = computed(() => {
  return portfolioStore.allPortfolios.find(p => p.id === portfolioId.value)
})

// Check if user can edit this portfolio
const canEdit = computed(() => {
  if (!loggedIn || !user) return false
  // Only portfolio owners or admins can edit
  return portfolioStore.canManagePortfolios || 
         (currentPortfolio.value && currentPortfolio.value.userId === user.id)
})

// Load portfolio data when route changes
watch(portfolioId, async (newId) => {
  if (newId && currentPortfolio.value) {
    try {
      await portfolioStore.setCurrentPortfolio(newId)
    } catch (error) {
      console.error('Failed to load portfolio:', error)
    }
  }
}, { immediate: true })

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

// Get holding gain/loss
function getHoldingGainLoss(holding: { quantity: number; currentPrice?: number; avgPrice: number }): number {
  const currentValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
  const costBasis = holding.quantity * holding.avgPrice
  return currentValue - costBasis
}

// Get holding gain/loss percentage
function getHoldingGainLossPercentage(holding: { quantity: number; currentPrice?: number; avgPrice: number }): number {
  const costBasis = holding.quantity * holding.avgPrice
  if (costBasis === 0) return 0
  return (getHoldingGainLoss(holding) / costBasis) * 100
}

// Get gain/loss color class
function getGainLossColor(holding: { quantity: number; currentPrice?: number; avgPrice: number }): string {
  const gainLoss = getHoldingGainLoss(holding)
  return gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
}

// Refresh prices
async function refreshPrices(): Promise<void> {
  try {
    await portfolioStore.updatePrices()
  } catch (error) {
    console.error('Failed to refresh prices:', error)
  }
}

// Page meta
useHead({
  title: computed(() => currentPortfolio.value ? currentPortfolio.value.name : 'Portfolio'),
  meta: [
    { name: 'description', content: computed(() => 
      currentPortfolio.value ? 
      `Portfolio: ${currentPortfolio.value.name} - ${currentPortfolio.value.description || 'Investment tracking'}` :
      'Portfolio not found'
    )}
  ]
})
</script>

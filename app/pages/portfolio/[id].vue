<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading state -->
    <div v-if="portfolioStore.loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.loading') }}</p>
      </div>
    </div>

    <!-- Portfolio not found -->
    <div v-else-if="!currentPortfolio" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <ChartBarIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ $t('portfolioPage.notFound') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ $t('portfolioPage.noAccess') }}
        </p>
        <NuxtLink to="/" class="text-primary-500 hover:text-primary-600">
          {{ $t('common.backToHome') }}
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
              <span v-if="currentPortfolio.isDefault" class="text-sm text-primary-500 ml-2">({{ $t('portfolioPage.default') }})</span>
            </h1>
            <p v-if="currentPortfolio.description" class="text-gray-600 dark:text-gray-400 mb-2">
              {{ currentPortfolio.description }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-500">
              {{ $t('portfolioPage.portfolioId') }}: {{ currentPortfolio.id }}
            </p>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
            <!-- Admin Edit Button - only for admins -->
            <NuxtLink 
              v-if="isAdmin"
              :to="`/admin/portfolios?edit=${currentPortfolio.id}`"
              class="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
            >
              <PencilSquareIcon class="w-4 h-4 mr-2" />
              {{ $t('portfolioPage.adminEdit') }}
            </NuxtLink>
            
            <button 
              v-if="canEdit"
              type="button"
              class="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              :disabled="portfolioStore.loading"
              @click="refreshPrices"
            >
              <ArrowPathIcon class="w-4 h-4 mr-2" />
              {{ $t('portfolioPage.updatePrices') }}
            </button>
            <!-- Import button - also show for demo/testing when portfolio exists -->
            <button 
              v-if="canEdit || currentPortfolio"
              type="button"
              class="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              @click="showImportTransactions = true"
            >
              <ArrowUpTrayIcon class="w-4 h-4 mr-2" />
              {{ $t('portfolioPage.importTransactions') }}
            </button>
            <button 
              v-if="canEdit"
              type="button"
              class="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              @click="showAddTransaction = true"
            >
              <PlusIcon class="w-4 h-4 mr-2" />
              {{ $t('portfolioPage.addTransaction') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Portfolio Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <CurrencyDollarIcon class="w-8 h-8 text-green-500" />
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {{ $t('portfolioPage.totalValue') }}
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
              <ArrowTrendingUpIcon class="w-8 h-8" :class="portfolioStore.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'" />
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {{ $t('portfolioPage.totalGainLoss') }}
                </dt>
                <dd class="text-lg font-semibold" :class="portfolioStore.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ portfolioStore.totalGainLoss >= 0 ? '+' : '' }}${{ formatCurrency(Math.abs(portfolioStore.totalGainLoss)) }}
                  ({{ formatPercentage(portfolioStore.totalGainLossPercentage) }}%)
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
                  {{ $t('portfolioPage.holdings') }}
                </dt>
                <dd class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ portfolioStore.portfolioHoldings.length }} {{ $t('portfolioPage.positions') }}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <ClockIcon class="w-8 h-8 text-purple-500" />
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  {{ $t('portfolioPage.lastUpdated') }}
                </dt>
                <dd class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ formatDate(currentPortfolio.updatedAt) }}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <!-- Portfolio Overview Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Top Performers -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ $t('portfolioPage.topPerformers') }}</h3>
          <div v-if="topPerformers.length > 0" class="space-y-3">
            <div v-for="holding in topPerformers" :key="holding.id" class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                  <ArrowTrendingUpIcon class="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">${{ formatCurrency(holding.currentPrice || holding.avgPrice) }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-green-600 dark:text-green-400 font-medium">
                  +${{ formatCurrency(Math.abs(getHoldingGainLoss(holding))) }}
                </p>
                <p class="text-sm text-green-600 dark:text-green-400">
                  +{{ getHoldingGainLossPercentage(holding).toFixed(2) }}%
                </p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4">
            <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noPositivePerformers') }}</p>
          </div>
        </div>

        <!-- Portfolio Allocation -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ $t('portfolioPage.portfolioAllocation') }}</h3>
          <div v-if="portfolioStore.portfolioHoldings.length > 0" class="space-y-3">
            <div v-for="holding in portfolioStore.portfolioHoldings" :key="holding.id" class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full mr-3" :style="{ backgroundColor: getColorForSymbol(holding.symbol) }" />
                <span class="font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</span>
              </div>
              <div class="text-right">
                <p class="font-medium text-gray-900 dark:text-white">{{ getAllocationPercentage(holding).toFixed(1) }}%</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${{ formatCurrency(holding.quantity * (holding.currentPrice || holding.avgPrice)) }}</p>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-4">
            <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noHoldingsToDisplay') }}</p>
          </div>
        </div>
      </div>

      <!-- Quick Insights -->
      <div v-if="portfolioStore.portfolioHoldings.length > 0" class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 mb-8">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ $t('portfolioPage.portfolioInsights') }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ getTopPerformerSymbol() }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.bestPerformer') }}</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ getLargestHoldingSymbol() }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.largestPosition') }}</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ portfolioStore.portfolioTransactions.length }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.totalTransactions') }}</p>
          </div>
        </div>
      </div>

      <!-- Holdings Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('portfolioPage.holdingsTable') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table v-if="portfolioStore.portfolioHoldings.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.symbol') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.quantity') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.avgPrice') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.currentPrice') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.marketValue') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.gainLoss') }}</th>
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
                    {{ getHoldingGainLoss(holding) >= 0 ? '+' : '-' }}${{ formatCurrency(Math.abs(getHoldingGainLoss(holding))) }}
                    ({{ getHoldingGainLoss(holding) >= 0 ? '+' : '-' }}{{ Math.abs(getHoldingGainLossPercentage(holding)).toFixed(2) }}%)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="px-6 py-8 text-center">
            <ChartBarIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noHoldingsFound') }}</p>
            <p v-if="canEdit" class="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {{ $t('portfolioPage.startByAdding') }}
            </p>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('portfolioPage.recentTransactions') }}</h3>
          <div v-if="canEdit" class="flex gap-2">
            <button
              type="button"
              class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              @click="showAddTransaction = true"
            >
              {{ $t('portfolioPage.addTransaction') }}
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table v-if="portfolioStore.portfolioTransactions.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.date') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.symbol') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.type') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.quantity') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.price') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.total') }}</th>
                <th v-if="canEdit" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.actions') }}</th>
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
                  <span 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getTransactionTypeClass(transaction.type)"
                  >
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
                  <button class="text-primary-600 hover:text-primary-500 mr-2">{{ $t('portfolioPage.edit') }}</button>
                  <button class="text-red-600 hover:text-red-500">{{ $t('portfolioPage.delete') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="px-6 py-8 text-center">
            <ClockIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noTransactionsFound') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Transaction Modal would go here -->
    <!-- This would be the same modal component used in the current portfolio page -->
    
    <!-- Import Transactions Modal -->
    <Teleport to="body">
      <LazyPortfolioImportTransactionsModal 
        v-if="showImportTransactions"
        v-model="showImportTransactions" 
        @success="handleImportSuccess" 
      />
    </Teleport>
    
    <!-- Debug info (remove this later) -->
    <div v-if="false" class="fixed bottom-4 right-4 bg-black text-white p-2 text-xs z-50">
      showImportTransactions: {{ showImportTransactions }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  PlusIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  PencilSquareIcon,
  ArrowUpTrayIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const portfolioStore = usePortfolioStore()
const { loggedIn, user, canManagePortfolios } = useAppAuth()

const showAddTransaction = ref(false)
const showImportTransactions = ref(false)

// Initialize store data
onMounted(async () => {
  await portfolioStore.initialize()
})

// Get portfolio ID from route
const portfolioId = computed(() => route.params.id as string)

// Get current portfolio
const currentPortfolio = computed(() => {
  return portfolioStore.allPortfolios.find(p => p.id === portfolioId.value)
})

// Check if user can edit this portfolio
const canEdit = computed(() => {
  if (!loggedIn.value || !user.value) return false
  // Only portfolio owners or admins can edit
  return portfolioStore.canManagePortfolios || 
         (currentPortfolio.value && currentPortfolio.value.userId === user.value.id)
})

// Check if user is admin (for admin edit button)
const isAdmin = computed(() => {
  return loggedIn.value && canManagePortfolios.value
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

// Computed properties for enhanced portfolio analytics
const topPerformers = computed(() => {
  return portfolioStore.portfolioHoldings
    .filter(holding => getHoldingGainLoss(holding) > 0)
    .sort((a, b) => getHoldingGainLoss(b) - getHoldingGainLoss(a))
    .slice(0, 3)
})

const totalPortfolioValue = computed(() => {
  return portfolioStore.portfolioHoldings.reduce((total, holding) => {
    return total + (holding.quantity * (holding.currentPrice || holding.avgPrice))
  }, 0)
})

// Get allocation percentage for a holding
function getAllocationPercentage(holding: { quantity: number; currentPrice?: number; avgPrice: number }): number {
  const holdingValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
  const total = totalPortfolioValue.value
  return total > 0 ? (holdingValue / total) * 100 : 0
}

// Get a consistent color for each symbol
function getColorForSymbol(symbol: string): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length] as string
}

// Get the symbol of the top performing holding
function getTopPerformerSymbol(): string {
  const performer = topPerformers.value[0]
  return performer ? performer.symbol : 'N/A'
}

// Get the symbol of the largest holding by value
function getLargestHoldingSymbol(): string {
  if (portfolioStore.portfolioHoldings.length === 0) return 'N/A'
  
  const largest = portfolioStore.portfolioHoldings.reduce((max, holding) => {
    const value = holding.quantity * (holding.currentPrice || holding.avgPrice)
    const maxValue = max.quantity * (max.currentPrice || max.avgPrice)
    return value > maxValue ? holding : max
  })
  
  return largest.symbol
}

// Get transaction type styling
function getTransactionTypeClass(type: string): string {
  switch (type) {
    case 'BUY':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'SELL':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'DIVIDEND':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'SPLIT':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'MERGER':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Format percentage
function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
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

// Handle import success
function handleImportSuccess(): void {
  // The import modal will already refresh the portfolio data
  showImportTransactions.value = false
}

// Page meta
const { t } = useI18n()

useHead({
  title: computed(() => currentPortfolio.value ? currentPortfolio.value.name : t('portfolio.portfolio')),
  meta: [
    { name: 'description', content: computed(() => 
      currentPortfolio.value ? 
      `${t('portfolio.portfolio')}: ${currentPortfolio.value.name} - ${currentPortfolio.value.description || t('common.managementDescription')}` :
      t('portfolioPage.notFound')
    )}
  ]
})
</script>

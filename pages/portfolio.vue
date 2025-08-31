<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Authentication check -->
    <div v-if="!isAuthenticated" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <UIcon name="i-heroicons-lock-closed" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Required
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Please sign in to access your portfolio
        </p>
        <UButton @click="login">
          Sign In
        </UButton>
      </div>
    </div>

    <!-- Portfolio content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Portfolio Dashboard
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              Manage your investments and track performance
            </p>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
            <UButton 
              variant="outline" 
              :loading="portfolioStore.loading"
              @click="refreshPrices"
            >
              <UIcon name="i-heroicons-arrow-path" class="mr-2" />
              Update Prices
            </UButton>
            <UButton @click="showAddTransaction = true">
              <UIcon name="i-heroicons-plus" class="mr-2" />
              Add Transaction
            </UButton>
          </div>
        </div>

        <!-- Portfolio selector -->
        <div v-if="portfolioStore.portfolios.length > 1" class="mb-6">
          <USelectMenu
            v-model="selectedPortfolioId"
            :options="portfolioOptions"
            option-attribute="label"
            value-attribute="value"
            @update:model-value="handlePortfolioChange"
          >
            <template #label>
              <span class="truncate">{{ currentPortfolioName }}</span>
            </template>
          </USelectMenu>
        </div>
      </div>

      <!-- Portfolio not found -->
      <div v-if="!portfolioStore.currentPortfolio && !portfolioStore.loading" class="text-center py-12">
        <UIcon name="i-heroicons-chart-bar" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Portfolio Found
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Create your first portfolio to start tracking investments
        </p>
        <UButton @click="showCreatePortfolio = true">
          Create Portfolio
        </UButton>
      </div>

      <!-- Loading state -->
      <div v-else-if="portfolioStore.loading" class="flex justify-center items-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
      </div>

      <!-- Portfolio content -->
      <div v-else-if="portfolioStore.currentPortfolio">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</span>
                <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4 text-gray-400" />
              </div>
            </template>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              ${{ formatCurrency(portfolioStore.totalValue) }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Gain/Loss</span>
                <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-gray-400" />
              </div>
            </template>
            <p class="text-2xl font-bold" :class="gainLossColor">
              ${{ formatCurrency(portfolioStore.totalGainLoss) }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Percentage</span>
                <UIcon name="i-heroicons-calculator" class="w-4 h-4 text-gray-400" />
              </div>
            </template>
            <p class="text-2xl font-bold" :class="gainLossColor">
              {{ formatPercentage(portfolioStore.totalGainLossPercentage) }}%
            </p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Holdings</span>
                <UIcon name="i-heroicons-building-office" class="w-4 h-4 text-gray-400" />
              </div>
            </template>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ portfolioStore.portfolioHoldings.length }}
            </p>
          </UCard>
        </div>

        <!-- Holdings Table -->
        <UCard class="mb-8">
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Holdings</h2>
          </template>
          
          <PortfolioHoldingsTable :holdings="portfolioStore.portfolioHoldings" />
        </UCard>

        <!-- Recent Transactions -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
              <UButton variant="ghost" size="sm" to="/portfolio/transactions">
                View All
              </UButton>
            </div>
          </template>
          
          <PortfolioTransactionsTable 
            :transactions="recentTransactions" 
            @edit="handleEditTransaction"
            @delete="handleDeleteTransaction"
          />
        </UCard>
      </div>
    </div>

    <!-- Add Transaction Modal -->
    <PortfolioAddTransactionModal 
      v-model="showAddTransaction"
      @success="handleTransactionAdded"
    />

    <!-- Create Portfolio Modal -->
    <PortfolioCreateModal 
      v-model="showCreatePortfolio"
      @success="handlePortfolioCreated"
    />

    <!-- Edit Transaction Modal -->
    <PortfolioEditTransactionModal 
      v-model="showEditTransaction"
      :transaction="selectedTransaction"
      @success="handleTransactionUpdated"
    />
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const { isAuthenticated, login } = useKindeAuth()
const portfolioStore = usePortfolioStore()
const toast = useToast()

// Reactive state
const showAddTransaction = ref(false)
const showCreatePortfolio = ref(false)
const showEditTransaction = ref(false)
const selectedTransaction = ref(null)
const selectedPortfolioId = ref('')

// Computed properties
const portfolioOptions = computed(() => 
  portfolioStore.portfolios.map(p => ({
    label: p.name,
    value: p.id
  }))
)

const currentPortfolioName = computed(() => 
  portfolioStore.currentPortfolio?.name || 'Select Portfolio'
)

const gainLossColor = computed(() => ({
  'text-green-600 dark:text-green-400': portfolioStore.totalGainLoss >= 0,
  'text-red-600 dark:text-red-400': portfolioStore.totalGainLoss < 0
}))

const recentTransactions = computed(() => 
  portfolioStore.portfolioTransactions.slice(0, 10)
)

// Methods
function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value))
}

function formatPercentage(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

async function handlePortfolioChange(portfolioId) {
  try {
    await portfolioStore.setCurrentPortfolio(portfolioId)
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to load portfolio',
      color: 'red'
    })
  }
}

async function refreshPrices() {
  try {
    await portfolioStore.updatePrices()
    toast.add({
      title: 'Success',
      description: 'Prices updated successfully'
    })
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to update prices',
      color: 'red'
    })
  }
}

function handleTransactionAdded() {
  showAddTransaction.value = false
  toast.add({
    title: 'Success',
    description: 'Transaction added successfully'
  })
}

function handlePortfolioCreated() {
  showCreatePortfolio.value = false
  toast.add({
    title: 'Success',
    description: 'Portfolio created successfully'
  })
}

function handleEditTransaction(transaction) {
  selectedTransaction.value = transaction
  showEditTransaction.value = true
}

function handleTransactionUpdated() {
  showEditTransaction.value = false
  selectedTransaction.value = null
  toast.add({
    title: 'Success',
    description: 'Transaction updated successfully'
  })
}

async function handleDeleteTransaction(transaction) {
  try {
    await portfolioStore.deleteTransaction(transaction.id)
    toast.add({
      title: 'Success',
      description: 'Transaction deleted successfully'
    })
  } catch {
    toast.add({
      title: 'Error',
      description: 'Failed to delete transaction',
      color: 'red'
    })
  }
}

// Initialize
onMounted(() => {
  if (isAuthenticated.value && portfolioStore.currentPortfolio) {
    selectedPortfolioId.value = portfolioStore.currentPortfolio.id
  }
})

// Watch for portfolio changes
watch(() => portfolioStore.currentPortfolio, (newPortfolio) => {
  if (newPortfolio) {
    selectedPortfolioId.value = newPortfolio.id
  }
}, { immediate: true })

useHead({
  title: 'Portfolio'
})
</script>

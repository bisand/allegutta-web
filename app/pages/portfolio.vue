<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Authentication check -->
    <div v-if="!loggedIn" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <UIcon name="i-heroicons-lock-closed" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Required
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Please sign in to access your portfolio
        </p>
        <NuxtLink to="/api/login" external>
          <UButton>
            Sign In
          </UButton>
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

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

// Define transaction type inline for now
interface Transaction {
  id: string
  portfolioId: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  date: string
  fee?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

const { loggedIn } = useAuth()
const portfolioStore = usePortfolioStore()

// Reactive state
const showAddTransaction = ref(false)
const showCreatePortfolio = ref(false)
const showEditTransaction = ref(false)
const selectedTransaction = ref<Transaction | null>(null)
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
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(value))
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

async function handlePortfolioChange(portfolioId: string): Promise<void> {
  try {
    await portfolioStore.setCurrentPortfolio(portfolioId)
  } catch (error) {
    console.error('Failed to load portfolio:', error)
  }
}

async function refreshPrices(): Promise<void> {
  try {
    await portfolioStore.updatePrices()
    console.log('Prices updated successfully')
  } catch (error) {
    console.error('Failed to update prices:', error)
  }
}

function handleTransactionAdded(): void {
  showAddTransaction.value = false
  console.log('Transaction added successfully')
}

function handlePortfolioCreated(): void {
  showCreatePortfolio.value = false
  console.log('Portfolio created successfully')
}

function handleEditTransaction(transaction: Transaction): void {
  selectedTransaction.value = transaction
  showEditTransaction.value = true
}

function handleTransactionUpdated(): void {
  showEditTransaction.value = false
  selectedTransaction.value = null
  console.log('Transaction updated successfully')
}

async function handleDeleteTransaction(transaction: Transaction): Promise<void> {
  try {
    await portfolioStore.deleteTransaction(transaction.id)
    console.log('Transaction deleted successfully')
  } catch (error) {
    console.error('Failed to delete transaction:', error)
  }
}

// Initialize
onMounted(() => {
  if (loggedIn.value && portfolioStore.currentPortfolio) {
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

<template>
  <div class="container mx-auto px-4 py-8">
    <!-- Admin Navigation -->
    <nav class="mb-6">
      <div class="flex space-x-8">
        <NuxtLink 
          to="/admin/portfolios" 
          class="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 pb-2"
        >
          Portfolio Management
        </NuxtLink>
        <NuxtLink 
          to="/admin/holdings" 
          class="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border-b-2 border-blue-600 dark:border-blue-400 pb-2"
        >
          Holdings GAV Management
        </NuxtLink>
      </div>
    </nav>

    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Holdings Management
      </h1>
      <p class="text-gray-600 dark:text-gray-300">
        Manage manual GAV (Gjennomsnittlig Anskaffelsesverdi) overrides for portfolio holdings
      </p>
    </div>

    <!-- Portfolio Selector -->
    <div class="mb-6">
      <label for="portfolio-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Portfolio
      </label>
      <select
        id="portfolio-select"
        v-model="selectedPortfolioId"
        class="w-full max-w-md border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @change="loadHoldings"
      >
        <option value="">Select a portfolio...</option>
        <option
          v-for="portfolio in portfolios"
          :key="portfolio.id"
          :value="portfolio.id"
        >
          {{ portfolio.name }}
        </option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      <p class="mt-4 text-gray-600 dark:text-gray-300">Loading holdings...</p>
    </div>

    <!-- Holdings Table -->
    <div v-else-if="selectedPortfolioId && holdings.length > 0" class="bg-white dark:bg-gray-900 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead class="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Symbol
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Quantity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Calculated GAV
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Manual GAV
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="holding in securitiesHoldings"
              :key="holding.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ holding.symbol }}
                </div>
                <div v-if="holding.isin" class="text-sm text-gray-500 dark:text-gray-400">
                  {{ holding.isin }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                {{ formatNumber(holding.quantity) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                {{ formatCurrency(holding.avgPrice, { currency: holding.currency }) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                <span v-if="holding.useManualAvgPrice && holding.manualAvgPrice">
                  {{ formatCurrency(holding.manualAvgPrice, { currency: holding.currency }) }}
                </span>
                <span v-else class="text-gray-500 dark:text-gray-400">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="holding.useManualAvgPrice" class="flex items-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100">
                    Manual GAV
                  </span>
                  <button
                    v-if="holding.manualAvgPriceReason"
                    class="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
                    :title="holding.manualAvgPriceReason"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
                <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100">
                  Calculated
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  @click="editManualGav(holding)"
                >
                  {{ holding.useManualAvgPrice ? 'Edit' : 'Set Manual GAV' }}
                </button>
                <button
                  v-if="holding.useManualAvgPrice"
                  class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  @click="removeManualGav(holding)"
                >
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="selectedPortfolioId && holdings.length === 0" class="text-center py-12">
      <svg class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p class="text-lg font-medium text-gray-900 dark:text-white">No holdings found</p>
      <p class="text-gray-600 dark:text-gray-300">This portfolio doesn't have any holdings yet.</p>
    </div>

    <!-- Manual GAV Edit Modal -->
    <PortfolioEditManualGavModal
      v-if="showManualGavModal"
      :holding="selectedHolding"
      :portfolio-id="selectedPortfolioId"
      @close="closeManualGavModal"
      @updated="handleGavUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCurrency } from '~/composables/useCurrency'

// Admin page for managing manual GAV overrides
// definePageMeta({
//   middleware: 'admin'
// })

interface Portfolio {
  id: string
  name: string
  description?: string | null
}

interface Holding {
  id: string
  portfolioId: string
  symbol: string
  isin?: string | null
  quantity: number
  avgPrice: number
  manualAvgPrice?: number | null
  useManualAvgPrice?: boolean
  manualAvgPriceReason?: string | null
  manualAvgPriceDate?: string | null
  currency: string
}

const { formatCurrency, formatNumber } = useCurrency()

const portfolios = ref<Portfolio[]>([])
const holdings = ref<Holding[]>([])
const selectedPortfolioId = ref('')
const loading = ref(false)
const showManualGavModal = ref(false)
const selectedHolding = ref<Holding | null>(null)

// Filter out cash holdings
const securitiesHoldings = computed(() => 
  holdings.value.filter(h => !h.symbol.startsWith('CASH_'))
)

onMounted(async () => {
  await loadPortfolios()
})

async function loadPortfolios() {
  try {
    // Try authenticated endpoint first, fall back to public if needed
    try {
      const response = await $fetch('/api/portfolios')
      portfolios.value = response.data || []
    } catch {
      // If authentication fails, try public endpoint
      const response = await $fetch('/api/public/portfolios')
      portfolios.value = response.data || []
    }
  } catch (error) {
    console.error('Error loading portfolios:', error)
  }
}

async function loadHoldings() {
  if (!selectedPortfolioId.value) {
    holdings.value = []
    return
  }

  loading.value = true
  try {
    const response = await $fetch(`/api/portfolios/${selectedPortfolioId.value}/holdings`)
    holdings.value = response.data?.holdings || []
  } catch (error) {
    console.error('Error loading holdings:', error)
    holdings.value = []
  } finally {
    loading.value = false
  }
}

function editManualGav(holding: Holding) {
  selectedHolding.value = holding
  showManualGavModal.value = true
}

async function removeManualGav(holding: Holding) {
  if (!confirm(`Are you sure you want to remove manual GAV for ${holding.symbol}? This will restore the calculated GAV.`)) {
    return
  }

  try {
    await $fetch(`/api/portfolios/${selectedPortfolioId.value}/holdings/${holding.symbol}/manual-gav`, {
      method: 'PUT',
      body: {
        useManualAvgPrice: false
      }
    })
    
    await loadHoldings() // Refresh holdings
  } catch (error) {
    console.error('Error removing manual GAV:', error)
  }
}

function closeManualGavModal() {
  showManualGavModal.value = false
  selectedHolding.value = null
}

async function handleGavUpdated() {
  await loadHoldings() // Refresh holdings
  closeManualGavModal()
}
</script>

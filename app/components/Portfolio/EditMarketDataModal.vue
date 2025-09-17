<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal" />

      <div
        class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <form @submit.prevent="submitForm">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Edit Market Data
                  </h3>
                  <button
                    type="button"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    @click="closeModal"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div class="space-y-4">
                  <!-- Current Position Info -->
                  <div v-if="holding" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Position Information</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Symbol:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">ISIN:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ holding.isin || 'N/A' }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Quantity:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ formatNumber(holding.quantity, 4) }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Current Yahoo Symbol:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ holding.symbolYahoo || 'Not set' }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Editable Fields -->
                  <div>
                    <label for="symbol" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Symbol *
                    </label>
                    <input
                      id="symbol"
                      v-model="form.symbol"
                      type="text"
                      required
                      maxlength="10"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., AAPL"
                      :class="{ 'border-red-500': errors.symbol }"
                    >
                    <p v-if="errors.symbol" class="text-red-500 text-xs mt-1">{{ errors.symbol }}</p>
                  </div>

                  <div>
                    <label for="symbolYahoo" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Yahoo Finance Symbol *
                    </label>
                    <input
                      id="symbolYahoo"
                      v-model="form.symbolYahoo"
                      type="text"
                      required
                      maxlength="20"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., AAPL, EQNR.OL, MOWI.OL"
                      :class="{ 'border-red-500': errors.symbolYahoo }"
                    >
                    <p v-if="errors.symbolYahoo" class="text-red-500 text-xs mt-1">{{ errors.symbolYahoo }}</p>
                    <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      For Norwegian stocks, usually add .OL suffix (e.g., EQNR.OL)
                    </p>
                  </div>

                  <div>
                    <label for="longName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name (Long)
                    </label>
                    <input
                      id="longName"
                      v-model="form.longName"
                      type="text"
                      maxlength="100"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Apple Inc."
                    >
                  </div>

                  <div>
                    <label for="shortName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name (Short)
                    </label>
                    <input
                      id="shortName"
                      v-model="form.shortName"
                      type="text"
                      maxlength="50"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Apple"
                    >
                  </div>

                  <div>
                    <label for="exchange" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Exchange
                    </label>
                    <input
                      id="exchange"
                      v-model="form.exchange"
                      type="text"
                      maxlength="20"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., OSL, NASDAQ"
                    >
                  </div>

                  <!-- Info about Yahoo symbols -->
                  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                    <div class="flex">
                      <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                      </svg>
                      <div class="text-sm">
                        <p class="font-medium text-blue-800 dark:text-blue-200">Yahoo Finance Symbol Guide</p>
                        <ul class="text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                          <li>• Norwegian stocks: Add <code>.OL</code> (e.g., EQNR.OL)</li>
                          <li>• US stocks: Use ticker as-is (e.g., AAPL)</li>
                          <li>• This symbol is used to fetch real-time prices</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              :disabled="submitting || !hasChanges"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="submitting">Updating...</span>
              <span v-else>Update Market Data</span>
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700"
              @click="closeModal"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Holding {
  id: string
  portfolioId: string
  symbol: string
  isin: string | null
  quantity: number
  avgPrice: number
  currency: string
  currentPrice?: number
  instrumentName?: string
  symbolYahoo?: string
}

interface Props {
  show: boolean
  holding: Holding | null
  portfolioId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  success: []
}>()

const { formatNumber } = useCurrency()

// Form state
const form = reactive({
  symbol: '',
  symbolYahoo: '',
  longName: '',
  shortName: '',
  exchange: ''
})

const errors = reactive({
  symbol: '',
  symbolYahoo: ''
})

const submitting = ref(false)

// Watch for holding changes to populate form
watch(() => props.holding, (holding) => {
  if (holding) {
    form.symbol = holding.symbol
    form.symbolYahoo = holding.symbolYahoo || ''
    form.longName = holding.instrumentName || ''
    form.shortName = ''
    form.exchange = ''
  }
}, { immediate: true })

// Check if form has changes
const hasChanges = computed(() => {
  if (!props.holding) return false
  
  return (
    form.symbol !== props.holding.symbol ||
    form.symbolYahoo !== (props.holding.symbolYahoo || '') ||
    form.longName !== (props.holding.instrumentName || '') ||
    form.shortName !== '' ||
    form.exchange !== ''
  )
})

// Validation
function validateForm(): boolean {
  // Reset errors
  errors.symbol = ''
  errors.symbolYahoo = ''

  let isValid = true

  // Symbol validation
  if (!form.symbol.trim()) {
    errors.symbol = 'Symbol is required'
    isValid = false
  } else if (form.symbol.length > 10) {
    errors.symbol = 'Symbol must be 10 characters or less'
    isValid = false
  }

  // Yahoo symbol validation
  if (!form.symbolYahoo.trim()) {
    errors.symbolYahoo = 'Yahoo Finance symbol is required'
    isValid = false
  } else if (form.symbolYahoo.length > 20) {
    errors.symbolYahoo = 'Yahoo symbol must be 20 characters or less'
    isValid = false
  }

  return isValid
}

// Submit form
async function submitForm(): Promise<void> {
  if (!validateForm() || !props.holding || !props.holding.isin) return

  submitting.value = true

  try {
    await $fetch(`/api/portfolios/${props.portfolioId}/market-data/${props.holding.isin}`, {
      method: 'PUT',
      body: {
        symbol: form.symbol.trim().toUpperCase(),
        symbolYahoo: form.symbolYahoo.trim(),
        longName: form.longName.trim() || null,
        shortName: form.shortName.trim() || null,
        exchange: form.exchange.trim() || null
      }
    })

    emit('success')
    closeModal()
  } catch (error: unknown) {
    console.error('Error updating market data:', error)
    
    // Handle specific errors
    const message = error && typeof error === 'object' && 'data' in error && 
                   error.data && typeof error.data === 'object' && 'message' in error.data 
                   ? String(error.data.message) 
                   : 'Failed to update market data. Please try again.'
    alert(message)
  } finally {
    submitting.value = false
  }
}

// Close modal
function closeModal(): void {
  emit('close')
  
  // Reset form
  nextTick(() => {
    if (props.holding) {
      form.symbol = props.holding.symbol
      form.symbolYahoo = props.holding.symbolYahoo || ''
      form.longName = props.holding.instrumentName || ''
      form.shortName = ''
      form.exchange = ''
    }
    
    // Reset errors
    errors.symbol = ''
    errors.symbolYahoo = ''
  })
}
</script>

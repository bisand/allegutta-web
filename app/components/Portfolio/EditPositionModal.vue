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
                    Edit Position Details
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
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Current Position</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Quantity:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ formatNumber(holding.quantity, 4) }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Avg Price:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ formatCurrency(holding.avgPrice) }}</span>
                      </div>
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Market Value:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">
                          {{ formatCurrency((holding.currentPrice || holding.avgPrice) * holding.quantity) }}
                        </span>
                      </div>
                      <div>
                        <span class="text-gray-500 dark:text-gray-400">Currency:</span>
                        <span class="ml-2 font-medium text-gray-900 dark:text-white">{{ holding.currency }}</span>
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
                    <label for="isin" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ISIN
                    </label>
                    <input
                      id="isin"
                      v-model="form.isin"
                      type="text"
                      maxlength="12"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., US0378331005"
                      style="text-transform: uppercase"
                      :class="{ 'border-red-500': errors.isin }"
                    >
                    <p v-if="errors.isin" class="text-red-500 text-xs mt-1">{{ errors.isin }}</p>
                    <p class="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      12-character International Securities Identification Number
                    </p>
                  </div>

                  <div>
                    <label for="currency" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Currency *
                    </label>
                    <select
                      id="currency"
                      v-model="form.currency"
                      required
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      :class="{ 'border-red-500': errors.currency }"
                    >
                      <option value="NOK">NOK - Norwegian Krone</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="SEK">SEK - Swedish Krona</option>
                      <option value="DKK">DKK - Danish Krone</option>
                    </select>
                    <p v-if="errors.currency" class="text-red-500 text-xs mt-1">{{ errors.currency }}</p>
                  </div>

                  <!-- Warning about changes -->
                  <div v-if="hasChanges" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                    <div class="flex">
                      <svg class="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <div class="text-sm">
                        <p class="font-medium text-yellow-800 dark:text-yellow-200">Important</p>
                        <p class="text-yellow-700 dark:text-yellow-300">
                          Changing the symbol will also update all related transactions. 
                          This action cannot be undone easily.
                        </p>
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
              <span v-else>Update Position</span>
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
}

interface Props {
  show: boolean
  holding: Holding | null
  portfolioId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  success: [holding: Holding]
}>()

const { formatNumber, formatCurrency } = useCurrency()

// Form state
const form = reactive({
  symbol: '',
  isin: '',
  currency: 'NOK'
})

const errors = reactive({
  symbol: '',
  isin: '',
  currency: ''
})

const submitting = ref(false)

// Watch for holding changes to populate form
watch(() => props.holding, (holding) => {
  if (holding) {
    form.symbol = holding.symbol
    form.isin = holding.isin || ''
    form.currency = holding.currency
  }
}, { immediate: true })

// Check if form has changes
const hasChanges = computed(() => {
  if (!props.holding) return false
  
  return (
    form.symbol !== props.holding.symbol ||
    form.isin !== (props.holding.isin || '') ||
    form.currency !== props.holding.currency
  )
})

// Validation
function validateForm(): boolean {
  // Reset errors
  errors.symbol = ''
  errors.isin = ''
  errors.currency = ''

  let isValid = true

  // Symbol validation
  if (!form.symbol.trim()) {
    errors.symbol = 'Symbol is required'
    isValid = false
  } else if (form.symbol.length > 10) {
    errors.symbol = 'Symbol must be 10 characters or less'
    isValid = false
  }

  // ISIN validation
  if (form.isin && form.isin.length !== 12) {
    errors.isin = 'ISIN must be exactly 12 characters'
    isValid = false
  }

  // Currency validation
  if (!form.currency) {
    errors.currency = 'Currency is required'
    isValid = false
  }

  return isValid
}

// Submit form
async function submitForm(): Promise<void> {
  if (!validateForm() || !props.holding) return

  submitting.value = true

  try {
    const response = await $fetch(`/api/portfolios/${props.portfolioId}/holdings/${props.holding.id}`, {
      method: 'PUT',
      body: {
        symbol: form.symbol.trim().toUpperCase(),
        isin: form.isin.trim() || null,
        currency: form.currency
      }
    })

    emit('success', response.holding)
    closeModal()
  } catch (error: unknown) {
    console.error('Error updating position:', error)
    
    // Handle specific errors
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 409) {
      errors.symbol = 'A position with this symbol already exists'
    } else {
      // Show a generic error - you might want to add a toast notification here
      const message = error && typeof error === 'object' && 'data' in error && 
                     error.data && typeof error.data === 'object' && 'message' in error.data 
                     ? String(error.data.message) 
                     : 'Failed to update position. Please try again.'
      alert(message)
    }
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
      form.isin = props.holding.isin || ''
      form.currency = props.holding.currency
    }
    
    // Reset errors
    errors.symbol = ''
    errors.isin = ''
    errors.currency = ''
  })
}
</script>

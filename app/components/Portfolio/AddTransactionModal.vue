<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal" />

      <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
        <form @submit.prevent="submitForm">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {{ transaction ? 'Edit Transaction' : 'Add New Transaction' }}
                  </h3>
                  <button
                    type="button"
                    class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                    @click="closeModal"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Symbol -->
                  <div>
                    <label for="symbol" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Symbol *
                    </label>
                    <input
                      id="symbol"
                      v-model="form.symbol"
                      type="text"
                      required
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., AAPL"
                      style="text-transform: uppercase"
                      :class="{ 'border-red-500': errors.symbol }"
                    >
                    <p v-if="errors.symbol" class="text-red-500 text-xs mt-1">{{ errors.symbol }}</p>
                  </div>

                  <!-- ISIN -->
                  <div>
                    <label for="isin" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ISIN (Optional)
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

                  <!-- Type -->
                  <div>
                    <label for="type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Transaction Type *
                    </label>
                    <select
                      id="type"
                      v-model="form.type"
                      required
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      :class="{ 'border-red-500': errors.type }"
                    >
                      <option value="BUY">Buy</option>
                      <option value="SELL">Sell</option>
                      <option value="DIVIDEND">Dividend</option>
                      <option value="DIVIDEND_REINVEST">Dividend Reinvest</option>
                      <option value="DEPOSIT">Deposit</option>
                      <option value="WITHDRAWAL">Withdrawal</option>
                      <option value="REFUND">Refund</option>
                      <option value="SPLIT">Stock Split</option>
                      <option value="MERGER">Merger</option>
                      <option value="LIQUIDATION">Liquidation</option>
                      <option value="REDEMPTION">Redemption</option>
                      <option value="EXCHANGE_IN">Exchange In</option>
                      <option value="EXCHANGE_OUT">Exchange Out</option>
                      <option value="SPIN_OFF_IN">Spin-off In</option>
                      <option value="DECIMAL_LIQUIDATION">Decimal Liquidation</option>
                      <option value="DECIMAL_WITHDRAWAL">Decimal Withdrawal</option>
                      <option value="RIGHTS_ALLOCATION">Rights Allocation</option>
                      <option value="RIGHTS_ISSUE">Rights Issue</option>
                      <option value="TRANSFER_IN">Transfer In</option>
                      <option value="INTEREST_CHARGE">Interest Charge</option>
                    </select>
                    <p v-if="errors.type" class="text-red-500 text-xs mt-1">{{ errors.type }}</p>
                  </div>

                  <!-- Currency -->
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

                  <!-- Quantity -->
                  <div>
                    <label for="quantity" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity *
                    </label>
                    <input
                      id="quantity"
                      v-model.number="form.quantity"
                      type="number"
                      step="1"
                      min="1"
                      required
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., 10"
                      :class="{ 'border-red-500': errors.quantity }"
                    >
                    <p v-if="errors.quantity" class="text-red-500 text-xs mt-1">{{ errors.quantity }}</p>
                  </div>

                  <!-- Price -->
                  <div>
                    <label for="price" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Price ({{ form.currency }}) *
                    </label>
                    <input
                      id="price"
                      v-model.number="form.price"
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., 150.00"
                      :class="{ 'border-red-500': errors.price }"
                    >
                    <p v-if="errors.price" class="text-red-500 text-xs mt-1">{{ errors.price }}</p>
                  </div>

                  <!-- Fees -->
                  <div>
                    <label for="fees" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Fees ({{ form.currency }})
                    </label>
                    <input
                      id="fees"
                      v-model.number="form.fees"
                      type="number"
                      step="0.0001"
                      min="0"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., 9.99"
                      :class="{ 'border-red-500': errors.fees }"
                    >
                    <p v-if="errors.fees" class="text-red-500 text-xs mt-1">{{ errors.fees }}</p>
                  </div>

                  <!-- Date -->
                  <div>
                    <label for="date" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date *
                    </label>
                    <input
                      id="date"
                      v-model="form.date"
                      type="date"
                      required
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      :class="{ 'border-red-500': errors.date }"
                    >
                    <p v-if="errors.date" class="text-red-500 text-xs mt-1">{{ errors.date }}</p>
                  </div>

                  <!-- Notes -->
                  <div class="md:col-span-2">
                    <label for="notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      id="notes"
                      v-model="form.notes"
                      type="text"
                      class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Transaction notes"
                      :class="{ 'border-red-500': errors.notes }"
                    >
                    <p v-if="errors.notes" class="text-red-500 text-xs mt-1">{{ errors.notes }}</p>
                  </div>
                </div>

                <!-- Total calculation display -->
                <div v-if="form.quantity && form.price" class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div class="text-sm text-gray-700 dark:text-gray-300">
                    <div class="flex justify-between">
                      <span>Subtotal ({{ form.quantity }} × {{ formatCurrency(form.price) }}):</span>
                      <span>{{ formatCurrency(form.quantity * form.price) }}</span>
                    </div>
                    <div v-if="form.fees" class="flex justify-between">
                      <span>Fees:</span>
                      <span>{{ formatCurrency(form.fees) }}</span>
                    </div>
                    <div class="flex justify-between font-medium border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <span>Total:</span>
                      <span>{{ formatCurrency((form.quantity * form.price) + (form.fees || 0)) }}</span>
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
              <span v-if="submitting">{{ transaction ? 'Updating...' : 'Adding...' }}</span>
              <span v-else>{{ transaction ? 'Update Transaction' : 'Add Transaction' }}</span>
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
interface Transaction {
  id: string
  symbol: string
  isin?: string | null
  type: string
  quantity: number
  price: number
  fees: number
  currency: string
  date: string
  notes?: string | null
}

interface Props {
  show: boolean
  transaction?: Transaction | null
  portfolioId: string
  portfolioCurrency?: string
}

interface Emits {
  close: []
  success: []
}

const props = withDefaults(defineProps<Props>(), {
  transaction: null,
  portfolioCurrency: 'NOK'
})

const emit = defineEmits<Emits>()

const { formatCurrency } = useCurrency()

// Form state
const form = reactive({
  symbol: '',
  isin: '',
  type: 'BUY',
  quantity: 0,
  price: 0,
  fees: 0,
  currency: 'NOK',
  date: new Date().toISOString().split('T')[0],
  notes: ''
})

const originalForm = ref<typeof form>()
const submitting = ref(false)
const errors = ref<Record<string, string>>({})

// Computed properties
const hasChanges = computed(() => {
  if (!originalForm.value) return true // New transaction
  
  return (
    form.symbol !== originalForm.value.symbol ||
    form.isin !== originalForm.value.isin ||
    form.type !== originalForm.value.type ||
    form.quantity !== originalForm.value.quantity ||
    form.price !== originalForm.value.price ||
    form.fees !== originalForm.value.fees ||
    form.currency !== originalForm.value.currency ||
    form.date !== originalForm.value.date ||
    form.notes !== originalForm.value.notes
  )
})

// Methods
function resetForm() {
  form.symbol = ''
  form.isin = ''
  form.type = 'BUY'
  form.quantity = 0
  form.price = 0
  form.fees = 0
  form.currency = props.portfolioCurrency || 'NOK'
  form.date = new Date().toISOString().split('T')[0]
  form.notes = ''
  errors.value = {}
  originalForm.value = undefined
}

function populateForm(transaction: Transaction) {
  form.symbol = transaction.symbol
  form.isin = transaction.isin || ''
  form.type = transaction.type
  form.quantity = transaction.quantity
  form.price = transaction.price
  form.fees = transaction.fees || 0
  form.currency = transaction.currency
  form.date = transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0]
  form.notes = transaction.notes || ''
  
  // Store original form state for change detection
  originalForm.value = { ...form }
  errors.value = {}
}

function validateForm(): boolean {
  errors.value = {}
  
  if (!form.symbol?.trim()) {
    errors.value.symbol = 'Symbol is required'
  }
  
  if (form.isin && form.isin.length !== 12) {
    errors.value.isin = 'ISIN must be exactly 12 characters'
  }
  
  if (!form.type) {
    errors.value.type = 'Transaction type is required'
  }
  
  if (!form.quantity || form.quantity <= 0) {
    errors.value.quantity = 'Quantity must be greater than 0'
  }
  
  if (!form.price || form.price <= 0) {
    errors.value.price = 'Price must be greater than 0'
  }
  
  if (form.fees < 0) {
    errors.value.fees = 'Fees cannot be negative'
  }
  
  if (!form.currency) {
    errors.value.currency = 'Currency is required'
  }
  
  if (!form.date) {
    errors.value.date = 'Date is required'
  }
  
  return Object.keys(errors.value).length === 0
}

async function submitForm() {
  if (!validateForm()) {
    return
  }
  
  submitting.value = true
  
  try {
    const transactionData = {
      symbol: form.symbol.toUpperCase(),
      isin: form.isin || undefined,
      type: form.type,
      quantity: form.quantity,
      price: form.price,
      fees: form.fees || 0,
      currency: form.currency,
      date: form.date,
      notes: form.notes || undefined
    }
    
    if (props.transaction) {
      // Update existing transaction
      await $fetch(`/api/portfolios/${props.portfolioId}/transactions/${props.transaction.id}`, {
        method: 'PUT',
        body: transactionData
      })
    } else {
      // Create new transaction
      await $fetch(`/api/portfolios/${props.portfolioId}/transactions`, {
        method: 'POST',
        body: transactionData
      })
    }
    
    emit('success')
    closeModal()
  } catch (error) {
    console.error('Transaction submission failed:', error)
    alert(`Failed to ${props.transaction ? 'update' : 'create'} transaction. Please try again.`)
  } finally {
    submitting.value = false
  }
}

function closeModal() {
  emit('close')
  resetForm()
}

// Watch for props changes
watch(() => props.show, (newShow) => {
  if (newShow) {
    if (props.transaction) {
      populateForm(props.transaction)
    } else {
      resetForm()
    }
  }
})

watch(() => props.transaction, (newTransaction) => {
  if (props.show) {
    if (newTransaction) {
      populateForm(newTransaction)
    } else {
      resetForm()
    }
  }
})
</script>
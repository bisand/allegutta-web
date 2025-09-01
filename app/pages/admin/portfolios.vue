<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Access denied -->
    <div v-if="!portfolioStore.canManagePortfolios" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <LockClosedIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          You don't have permission to manage portfolios.
        </p>
        <NuxtLink to="/" class="text-primary-500 hover:text-primary-600">
          Go back to home
        </NuxtLink>
      </div>
    </div>

    <!-- Admin content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Portfolio Management
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              Create and manage portfolios for the application
            </p>
          </div>
          
          <button 
            type="button"
            class="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors mt-4 sm:mt-0"
            @click="showCreateModal = true"
          >
            <PlusIcon class="w-4 h-4 mr-2" />
            Create Portfolio
          </button>
        </div>
      </div>

      <!-- Portfolios List -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">All Portfolios</h3>
        </div>
        <div class="overflow-x-auto">
          <table v-if="portfolioStore.allPortfolios.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="portfolio in portfolioStore.allPortfolios" :key="portfolio.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <ChartBarIcon class="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ portfolio.name }}
                      </div>
                      <div class="text-sm text-gray-500 dark:text-gray-400">
                        ID: {{ portfolio.id }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ portfolio.description || 'No description' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    v-if="portfolio.isDefault"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    Default
                  </span>
                  <span 
                    v-else
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    Active
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(portfolio.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-2">
                    <NuxtLink 
                      :to="`/portfolio/${portfolio.id}`"
                      class="text-primary-600 hover:text-primary-500"
                    >
                      View
                    </NuxtLink>
                    <button 
                      type="button"
                      class="text-indigo-600 hover:text-indigo-500"
                      @click="editPortfolio(portfolio)"
                    >
                      Edit
                    </button>
                    <button 
                      type="button"
                      class="text-blue-600 hover:text-blue-500"
                      @click="manageTransactions(portfolio)"
                    >
                      Transactions
                    </button>
                    <button 
                      v-if="!portfolio.isDefault"
                      type="button"
                      class="text-red-600 hover:text-red-500"
                      @click="deletePortfolio(portfolio)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="px-6 py-8 text-center">
            <ChartBarIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">No portfolios found</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Create your first portfolio to get started
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Portfolio Modal -->
    <div v-if="showCreateModal || editingPortfolio" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeModal" />
        
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form @submit.prevent="submitForm">
            <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                    {{ editingPortfolio ? 'Edit Portfolio' : 'Create New Portfolio' }}
                  </h3>
                  
                  <div class="space-y-4">
                    <div>
                      <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Portfolio Name
                      </label>
                      <input
                        id="name"
                        v-model="form.name"
                        type="text"
                        required
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter portfolio name"
                      >
                    </div>
                    
                    <div>
                      <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description (Optional)
                      </label>
                      <textarea
                        id="description"
                        v-model="form.description"
                        rows="3"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter portfolio description"
                      />
                    </div>
                    
                    <div class="flex items-center">
                      <input
                        id="isDefault"
                        v-model="form.isDefault"
                        type="checkbox"
                        class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      >
                      <label for="isDefault" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Set as default portfolio
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                :disabled="submitting"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                <span v-if="submitting">Saving...</span>
                <span v-else>{{ editingPortfolio ? 'Update' : 'Create' }}</span>
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

    <!-- Transaction Management Modal -->
    <div v-if="showTransactionModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closeTransactionModal" />
        
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Manage Transactions
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Portfolio: {{ selectedPortfolio?.name }}
                </p>
              </div>
              <button
                type="button"
                class="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                @click="showAddTransactionForm = true"
              >
                <PlusIcon class="w-4 h-4 mr-2" />
                Add Transaction
              </button>
            </div>

            <!-- Portfolio Holdings Summary -->
            <div v-if="portfolioHoldings.length > 0" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Current Holdings</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-for="holding in portfolioHoldings" :key="holding.id" class="flex items-center justify-between">
                  <span class="text-sm font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</span>
                  <div class="text-right">
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ holding.quantity }} shares</p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">${{ formatCurrency(holding.avgPrice) }} avg</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add Transaction Form -->
            <div v-if="showAddTransactionForm" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-sm font-medium text-gray-900 dark:text-white">Add New Transaction</h4>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  @click="cancelAddTransaction"
                >
                  ✕
                </button>
              </div>
              <form class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" @submit.prevent="submitTransaction">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol</label>
                  <input
                    v-model="transactionForm.symbol"
                    type="text"
                    required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="AAPL"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    v-model="transactionForm.type"
                    required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="BUY">Buy</option>
                    <option value="SELL">Sell</option>
                    <option value="DIVIDEND">Dividend</option>
                    <option value="SPLIT">Stock Split</option>
                    <option value="MERGER">Merger</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input
                    v-model.number="transactionForm.quantity"
                    type="number"
                    step="0.0001"
                    required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="10"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ($)</label>
                  <input
                    v-model.number="transactionForm.price"
                    type="number"
                    step="0.01"
                    required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="150.00"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fees ($)</label>
                  <input
                    v-model.number="transactionForm.fees"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="9.99"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    v-model="transactionForm.date"
                    type="date"
                    required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                </div>
                <div class="md:col-span-2 lg:col-span-3">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                  <input
                    v-model="transactionForm.notes"
                    type="text"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Transaction notes"
                  >
                </div>
                <div class="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700"
                    @click="cancelAddTransaction"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="submittingTransaction"
                    class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {{ submittingTransaction ? 'Adding...' : 'Add Transaction' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Transactions List -->
            <div class="overflow-x-auto">
              <table v-if="portfolioTransactions.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr v-for="transaction in portfolioTransactions" :key="transaction.id">
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
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button 
                          type="button"
                          class="text-indigo-600 hover:text-indigo-500"
                          @click="editTransaction(transaction)"
                        >
                          Edit
                        </button>
                        <button 
                          type="button"
                          class="text-red-600 hover:text-red-500"
                          @click="deleteTransaction(transaction)"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="px-6 py-8 text-center">
                <ChartBarIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p class="text-gray-500 dark:text-gray-400">No transactions found</p>
                <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Add the first transaction to get started
                </p>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 flex justify-end">
            <button
              type="button"
              class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700"
              @click="closeTransactionModal"
            >
              Close
            </button>
          </div>
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
import type { Portfolio } from '~/stores/portfolio'

interface TransactionData {
  id: string
  portfolioId: string
  symbol: string
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT' | 'MERGER'
  quantity: number
  price: number
  fees: number
  date: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface HoldingData {
  id: string
  portfolioId: string
  symbol: string
  quantity: number
  avgPrice: number
  currentPrice?: number
  updatedAt: string
}

// Auth check - redirect if not authenticated or not admin
const { loggedIn } = useAuth()
const portfolioStore = usePortfolioStore()

// Redirect if not logged in
if (!loggedIn) {
  throw createError({
    statusCode: 401,
    statusMessage: 'Unauthorized'
  })
}

// Modal states
const showCreateModal = ref(false)
const editingPortfolio = ref<Portfolio | null>(null)
const submitting = ref(false)

// Transaction management states
const showTransactionModal = ref(false)
const selectedPortfolio = ref<Portfolio | null>(null)
const showAddTransactionForm = ref(false)
const submittingTransaction = ref(false)
const portfolioTransactions = ref<TransactionData[]>([])
const portfolioHoldings = ref<HoldingData[]>([])

// Form data
const form = reactive({
  name: '',
  description: '',
  isDefault: false
})

// Transaction form data
const transactionForm = reactive({
  symbol: '',
  type: 'BUY',
  quantity: 0,
  price: 0,
  fees: 0,
  date: new Date().toISOString().split('T')[0],
  notes: ''
})

// Reset form
function resetForm(): void {
  form.name = ''
  form.description = ''
  form.isDefault = false
}

// Reset transaction form
function resetTransactionForm(): void {
  transactionForm.symbol = ''
  transactionForm.type = 'BUY'
  transactionForm.quantity = 0
  transactionForm.price = 0
  transactionForm.fees = 0
  transactionForm.date = new Date().toISOString().split('T')[0]
  transactionForm.notes = ''
}

// Close modal
function closeModal(): void {
  showCreateModal.value = false
  editingPortfolio.value = null
  resetForm()
}

// Transaction modal functions
function manageTransactions(portfolio: Portfolio): void {
  selectedPortfolio.value = portfolio
  showTransactionModal.value = true
  loadPortfolioData(portfolio.id)
}

function closeTransactionModal(): void {
  showTransactionModal.value = false
  selectedPortfolio.value = null
  showAddTransactionForm.value = false
  resetTransactionForm()
  portfolioTransactions.value = []
  portfolioHoldings.value = []
}

function cancelAddTransaction(): void {
  showAddTransactionForm.value = false
  resetTransactionForm()
}

// Load portfolio data (transactions and holdings)
async function loadPortfolioData(portfolioId: string): Promise<void> {
  try {
    // Load transactions
    const transactionsResponse = await $fetch(`/api/portfolios/${portfolioId}/transactions`)
    portfolioTransactions.value = transactionsResponse || []
    
    // Load holdings
    const holdingsResponse = await $fetch(`/api/portfolios/${portfolioId}/holdings`)
    portfolioHoldings.value = holdingsResponse || []
  } catch (error) {
    console.error('Failed to load portfolio data:', error)
  }
}

// Submit new transaction
async function submitTransaction(): Promise<void> {
  if (!selectedPortfolio.value) return
  
  try {
    submittingTransaction.value = true
    
    await $fetch(`/api/portfolios/${selectedPortfolio.value.id}/transactions`, {
      method: 'POST',
      body: {
        symbol: transactionForm.symbol.toUpperCase(),
        type: transactionForm.type,
        quantity: transactionForm.quantity,
        price: transactionForm.price,
        fees: transactionForm.fees || 0,
        date: transactionForm.date,
        notes: transactionForm.notes || undefined
      }
    })
    
    // Reload portfolio data
    await loadPortfolioData(selectedPortfolio.value.id)
    
    // Reset form
    cancelAddTransaction()
  } catch (error) {
    console.error('Failed to create transaction:', error)
    alert('Failed to create transaction. Please try again.')
  } finally {
    submittingTransaction.value = false
  }
}

// Edit transaction (placeholder for now)
function editTransaction(transaction: TransactionData): void {
  // TODO: Implement transaction editing
  console.log('Edit transaction:', transaction.id)
  alert('Transaction editing will be implemented in the next phase.')
}

// Delete transaction
async function deleteTransaction(transaction: TransactionData): Promise<void> {
  if (!selectedPortfolio.value) return
  
  if (confirm(`Are you sure you want to delete this ${transaction.type} transaction for ${transaction.symbol}?`)) {
    try {
      await $fetch(`/api/portfolios/${selectedPortfolio.value.id}/transactions/${transaction.id}`, {
        method: 'DELETE'
      })
      
      // Reload portfolio data
      await loadPortfolioData(selectedPortfolio.value.id)
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      alert('Failed to delete transaction. Please try again.')
    }
  }
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

// Edit portfolio
function editPortfolio(portfolio: Portfolio): void {
  editingPortfolio.value = portfolio
  form.name = portfolio.name
  form.description = portfolio.description || ''
  form.isDefault = portfolio.isDefault
}

// Delete portfolio
async function deletePortfolio(portfolio: Portfolio): Promise<void> {
  if (confirm(`Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`)) {
    try {
      await $fetch(`/api/portfolios/${portfolio.id}`, {
        method: 'DELETE'
      })
      
      // Reload portfolios
      await portfolioStore.loadAllPortfolios()
    } catch (error) {
      console.error('Failed to delete portfolio:', error)
      alert('Failed to delete portfolio. Please try again.')
    }
  }
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Submit form
async function submitForm(): Promise<void> {
  try {
    submitting.value = true
    
    if (editingPortfolio.value) {
      // Update existing portfolio
      await $fetch(`/api/portfolios/${editingPortfolio.value.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          description: form.description || undefined,
          isDefault: form.isDefault
        }
      })
    } else {
      // Create new portfolio
      await portfolioStore.createPortfolio({
        name: form.name,
        description: form.description || undefined,
        isDefault: form.isDefault
      })
    }
    
    // Reload portfolios
    await portfolioStore.loadAllPortfolios()
    closeModal()
  } catch (error) {
    console.error('Failed to save portfolio:', error)
    alert('Failed to save portfolio. Please try again.')
  } finally {
    submitting.value = false
  }
}

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

// Page meta
useHead({
  title: 'Portfolio Management',
  meta: [
    { name: 'description', content: 'Manage portfolios - Admin panel for AlleGutta' }
  ]
})
</script>

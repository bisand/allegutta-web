<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Access denied -->
    <div v-if="!canManagePortfolios" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <LockClosedIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ $t('auth.noPermission') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ $t('auth.noPermissionManagePortfolios') }}
        </p>
        <NuxtLink to="/" class="text-primary-500 hover:text-primary-600">
          {{ $t('common.backToHome') }}
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
              {{ $t('portfolio.management') }}
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              {{ $t('portfolio.managementDescription') }}
            </p>
          </div>

          <button type="button" class="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors mt-4 sm:mt-0"
            @click="showCreateModal = true">
            <PlusIcon class="w-4 h-4 mr-2" />
            {{ $t('portfolio.createPortfolio') }}
          </button>
        </div>
      </div>

      <!-- Portfolios List -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('portfolio.allPortfolios') }}</h3>
        </div>
        <div class="overflow-x-auto">
          <table v-if="portfolioStore.allPortfolios.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Currency</th>
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
                <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {{ portfolio.description || 'No description' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {{ portfolio.currency || 'NOK' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span v-if="portfolio.isDefault" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Default
                  </span>
                  <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Active
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(portfolio.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center gap-1">
                    <!-- View Portfolio -->
                    <NuxtLink :to="`/portfolio/${portfolio.id}`"
                      class="inline-flex items-center justify-center w-8 h-8 text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-md transition-colors dark:text-primary-300 dark:hover:text-primary-200 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 dark:border-primary-700"
                      title="View portfolio details">
                      <EyeIcon class="w-4 h-4" />
                    </NuxtLink>

                    <!-- Edit Portfolio -->
                    <button type="button"
                      class="inline-flex items-center justify-center w-8 h-8 text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors dark:text-indigo-300 dark:hover:text-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:border-indigo-700"
                      title="Edit portfolio settings" @click="editPortfolio(portfolio)">
                      <PencilIcon class="w-4 h-4" />
                    </button>

                    <!-- Manage Positions -->
                    <button type="button"
                      class="inline-flex items-center justify-center w-8 h-8 text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md transition-colors dark:text-green-300 dark:hover:text-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-green-700"
                      title="Manage portfolio positions" @click="managePositions(portfolio)">
                      <ChartPieIcon class="w-4 h-4" />
                    </button>

                    <!-- Manage Transactions -->
                    <button type="button"
                      class="inline-flex items-center justify-center w-8 h-8 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors dark:text-blue-300 dark:hover:text-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-700"
                      title="Manage portfolio transactions" @click="manageTransactions(portfolio)">
                      <DocumentTextIcon class="w-4 h-4" />
                    </button>

                    <!-- Delete Portfolio -->
                    <button v-if="!portfolio.isDefault" type="button"
                      class="inline-flex items-center justify-center w-8 h-8 text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors dark:text-red-300 dark:hover:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:border-red-700"
                      title="Delete portfolio" @click="deletePortfolio(portfolio)">
                      <TrashIcon class="w-4 h-4" />
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

        <div
          class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
                      <input id="name" v-model="form.name" type="text" required
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter portfolio name">
                    </div>

                    <div>
                      <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description (Optional)
                      </label>
                      <textarea id="description" v-model="form.description" rows="3"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter portfolio description" />
                    </div>

                    <div>
                      <label for="currency" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Currency
                      </label>
                      <select id="currency" v-model="form.currency" required
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="NOK">NOK - Norwegian Krone</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="SEK">SEK - Swedish Krona</option>
                        <option value="DKK">DKK - Danish Krone</option>
                      </select>
                    </div>

                    <div class="flex items-center">
                      <input id="isDefault" v-model="form.isDefault" type="checkbox" class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
                      <label for="isDefault" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                        Set as default portfolio
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="submit" :disabled="submitting"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                <span v-if="submitting">Saving...</span>
                <span v-else>{{ editingPortfolio ? 'Update' : 'Create' }}</span>
              </button>
              <button type="button"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700"
                @click="closeModal">
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

        <div
          class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
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
              <div class="flex gap-2">
                <button type="button"
                  class="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  @click="showImportTransactions = true">
                  <ArrowUpTrayIcon class="w-4 h-4 mr-2" />
                  Import Transactions
                </button>
                <button type="button" class="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                  @click="() => { console.log('Add Transaction clicked, selectedPortfolio:', selectedPortfolio); showAddTransactionForm = true; }">
                  <PlusIcon class="w-4 h-4 mr-2" />
                  Add Transaction
                </button>
              </div>
            </div>

            <!-- Portfolio Holdings Summary -->
            <div v-if="portfolioHoldings.length > 0" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Current Holdings</h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-for="holding in portfolioHoldings" :key="holding.id" class="flex items-center justify-between">
                  <div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</span>
                    <div v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400">{{ holding.instrumentName }}</div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ formatNumber(holding.quantity, 0) }} shares</p>
                    <p class="text-xs text-gray-500 dark:text-gray-500">{{ formatCurrency(holding.avgPrice) }} avg</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add Transaction Form -->
            <div v-if="showAddTransactionForm" class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <div class="flex items-center justify-between mb-4">
                <h4 class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ editingTransaction ? 'Edit Transaction' : 'Add New Transaction' }}
                </h4>
                <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="cancelAddTransaction">
                  ✕
                </button>
              </div>
              <form class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" @submit.prevent="submitTransaction">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Symbol</label>
                  <input v-model="transactionForm.symbol" type="text" required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="AAPL">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ISIN (Optional)</label>
                  <input v-model="transactionForm.isin" type="text" maxlength="12"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="US0378331005" style="text-transform: uppercase;">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select v-model="transactionForm.type" required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
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
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                  <input v-model.number="transactionForm.quantity" type="number" step="0.0001" min="0.0001"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="10">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price ({{ transactionForm.currency || selectedPortfolio?.currency || 'NOK'
                  }})</label>
                  <input v-model.number="transactionForm.price" type="number" step="0.01" min="0.01"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="150.00">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fees ({{ transactionForm.currency || selectedPortfolio?.currency || 'NOK'
                  }})</label>
                  <input v-model.number="transactionForm.fees" type="number" step="0.01" min="0"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="9.99">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <select v-model="transactionForm.currency"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="NOK">NOK - Norwegian Krone</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="SEK">SEK - Swedish Krona</option>
                    <option value="DKK">DKK - Danish Krone</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input v-model="transactionForm.date" type="date" required
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                </div>
                <div class="md:col-span-2 lg:col-span-3">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                  <input v-model="transactionForm.notes" type="text"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Transaction notes">
                </div>
                <div class="md:col-span-2 lg:col-span-3 flex justify-end space-x-3">
                  <button type="button"
                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700"
                    @click="cancelAddTransaction">
                    Cancel
                  </button>
                  <button type="submit" :disabled="submittingTransaction"
                    class="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                    @click="handleSubmitClick">
                    {{ submittingTransaction ? (editingTransaction ? 'Updating...' : 'Adding...') : (editingTransaction ? 'Update Transaction' : 'Add Transaction') }}
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
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fees</th>
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
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getTransactionTypeClass(transaction.type)">
                        {{ transaction.type }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ transaction.quantity }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatCurrency(transaction.price) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatCurrency(transaction.fees || 0) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatCurrency(calculateTransactionTotal(transaction)) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center space-x-2">
                        <button type="button" class="text-indigo-600 hover:text-indigo-500" @click="editTransaction(transaction)">
                          Edit
                        </button>
                        <button type="button" class="text-red-600 hover:text-red-500" @click="deleteTransaction(transaction)">
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
            <button type="button"
              class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700"
              @click="closeTransactionModal">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Positions Management Modal -->
    <div v-if="showPositionsListModal && selectedPortfolio && portfolioHoldings.length > 0" class="fixed inset-0 z-60 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="closePositionsListModal" />

        <div
          class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div>
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Manage Positions
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Portfolio: {{ selectedPortfolio?.name }}
                </p>
              </div>
              <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" @click="closePositionsListModal">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Positions List -->
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Symbol</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ISIN</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Yahoo Symbol</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Market Value</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P&L</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr v-for="holding in portfolioHoldings" :key="holding.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {{ holding.symbol }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ holding.isin || 'N/A' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span v-if="holding.symbolYahoo" class="text-gray-900 dark:text-white">{{ holding.symbolYahoo }}</span>
                      <span v-else class="text-red-500 font-medium">Not set</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatNumber(holding.quantity, 4) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatCurrency(holding.avgPrice) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ holding.currentPrice ? formatCurrency(holding.currentPrice) : 'N/A' }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatCurrency((holding.currentPrice || holding.avgPrice) * holding.quantity) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      <span v-if="holding.currentPrice" :class="{
                        'text-green-600': (holding.currentPrice - holding.avgPrice) * holding.quantity > 0,
                        'text-red-600': (holding.currentPrice - holding.avgPrice) * holding.quantity < 0,
                        'text-gray-500': (holding.currentPrice - holding.avgPrice) * holding.quantity === 0
                      }">
                        {{ formatCurrency((holding.currentPrice - holding.avgPrice) * holding.quantity) }}
                      </span>
                      <span v-else class="text-gray-500">N/A</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div class="flex items-center gap-1">
                        <button type="button"
                          class="inline-flex items-center justify-center w-8 h-8 text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors dark:text-indigo-300 dark:hover:text-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:border-indigo-700"
                          title="Edit position details (ISIN, symbol, currency)" @click="editPosition(holding)">
                          <PencilIcon class="w-4 h-4" />
                        </button>
                        <button type="button"
                          class="inline-flex items-center justify-center w-8 h-8 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors dark:text-blue-300 dark:hover:text-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-700"
                          title="Edit market data (Yahoo Finance symbol and company info)" @click="editMarketData(holding)">
                          <ChartBarIcon class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Position Modal -->
    <PortfolioEditPositionModal :show="showPositionModal" :holding="selectedPosition" :portfolio-id="selectedPortfolio?.id || ''" style="z-index: 70;" @close="closePositionModal"
      @success="handlePositionUpdate" />

    <!-- Edit Market Data Modal -->
    <PortfolioEditMarketDataModal :show="showMarketDataModal" :holding="selectedPosition" :portfolio-id="selectedPortfolio?.id || ''" style="z-index: 70;" @close="closeMarketDataModal"
      @success="handleMarketDataUpdate" />

    <!-- Import Transactions Modal -->
    <Teleport to="body">
      <LazyPortfolioImportTransactionsModal v-if="showImportTransactions && selectedPortfolio" v-model="showImportTransactions" :portfolio-id="selectedPortfolio.id"
        style="z-index: 60;" @success="handleImportSuccess" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  LockClosedIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  ChartPieIcon,
  DocumentTextIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import type { Portfolio } from '~/stores/portfolio'

definePageMeta({
  middleware: ['admin-client']
})

const { formatCurrency, formatNumber } = useCurrency()

interface TransactionData {
  id: string
  portfolioId: string
  symbol: string
  isin?: string
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL' | 'REFUND' | 'LIQUIDATION' | 'REDEMPTION' |
  'EXCHANGE_IN' | 'EXCHANGE_OUT' | 'SPIN_OFF_IN' | 'DECIMAL_LIQUIDATION' | 'DECIMAL_WITHDRAWAL' |
  'RIGHTS_ALLOCATION' | 'TRANSFER_IN' | 'DIVIDEND_REINVEST' | 'INTEREST_CHARGE' | 'RIGHTS_ISSUE' |
  'SPLIT' | 'MERGER'
  quantity: number
  price: number
  fees: number
  currency?: string
  date: string
  notes?: string
  createdAt: string
  updatedAt: string
}

interface HoldingData {
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
  createdAt: Date
  updatedAt: Date
}

const { canManagePortfolios, initialize } = useAuthorization()
const portfolioStore = usePortfolioStore()

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
const editingTransaction = ref<TransactionData | null>(null)
const showImportTransactions = ref(false)

// Position management states
const showPositionsListModal = ref(false)
const showPositionModal = ref(false)
const selectedPosition = ref<HoldingData | null>(null)
const showMarketDataModal = ref(false)

initialize()

// Watch for changes to selectedPortfolio
watch(selectedPortfolio, (newValue, oldValue) => {
  console.log('selectedPortfolio changed from:', oldValue, 'to:', newValue)
  if (newValue === null && oldValue !== null) {
    console.trace('selectedPortfolio was set to null - stack trace:')
  }
}, { deep: true })

// Check if there's a portfolio to edit from query params
const route = useRoute()
onMounted(async () => {
  const editId = route.query.edit as string
  if (editId) {
    // Wait for portfolios to load
    await portfolioStore.loadAllPortfolios()

    // Find and edit the portfolio
    const portfolioToEdit = portfolioStore.allPortfolios.find(p => p.id === editId)
    if (portfolioToEdit) {
      editPortfolio(portfolioToEdit)
    }
  }
})

// Form data
const form = reactive({
  name: '',
  description: '',
  currency: 'NOK',
  isDefault: false
})

// Transaction form data
const transactionForm = reactive({
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

// Reset form
function resetForm(): void {
  form.name = ''
  form.description = ''
  form.currency = 'NOK'
  form.isDefault = false
}

// Reset transaction form
function resetTransactionForm(): void {
  console.log('resetTransactionForm called, selectedPortfolio:', selectedPortfolio.value)
  transactionForm.symbol = ''
  transactionForm.isin = ''
  transactionForm.type = 'BUY'
  transactionForm.quantity = 0
  transactionForm.price = 0
  transactionForm.fees = 0
  transactionForm.currency = selectedPortfolio.value?.currency || 'NOK'
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
  console.log('manageTransactions called with portfolio:', portfolio)
  selectedPortfolio.value = portfolio
  showTransactionModal.value = true
  console.log('selectedPortfolio set to:', selectedPortfolio.value)
  loadPortfolioData(portfolio.id)
}

function closeTransactionModal(): void {
  showTransactionModal.value = false
  selectedPortfolio.value = null
  showAddTransactionForm.value = false
  editingTransaction.value = null
  showImportTransactions.value = false
  resetTransactionForm()
  portfolioTransactions.value = []
  portfolioHoldings.value = []
}

function cancelAddTransaction(): void {
  showAddTransactionForm.value = false
  editingTransaction.value = null
  resetTransactionForm()
}

// Handle import success
function handleImportSuccess(): void {
  if (selectedPortfolio.value) {
    // Reload portfolio data after successful import
    loadPortfolioData(selectedPortfolio.value.id)
  }
  showImportTransactions.value = false
}

// Position management functions
function managePositions(portfolio: Portfolio): void {
  console.log('managePositions called with portfolio:', portfolio)
  selectedPortfolio.value = portfolio
  showPositionsListModal.value = true
  loadPortfolioHoldings(portfolio.id)
}

function editPosition(holding: HoldingData): void {
  selectedPosition.value = holding
  showPositionModal.value = true
  // Don't close the positions list modal, let them stack
}

function closePositionsListModal(): void {
  showPositionsListModal.value = false
  // Keep selectedPortfolio and portfolioHoldings since they might be used by edit modals
}

function closePositionModal(): void {
  showPositionModal.value = false
  selectedPosition.value = null
  // Don't clear selectedPortfolio here since it might be used by other modals
}

function editMarketData(holding: HoldingData): void {
  selectedPosition.value = holding
  showMarketDataModal.value = true
}

function closeMarketDataModal(): void {
  showMarketDataModal.value = false
  selectedPosition.value = null
}

function handleMarketDataUpdate(): void {
  // Reload holdings after successful market data update
  if (selectedPortfolio.value) {
    loadPortfolioHoldings(selectedPortfolio.value.id)
  }
}

function handlePositionUpdate(): void {
  // Reload holdings after successful update
  if (selectedPortfolio.value) {
    loadPortfolioHoldings(selectedPortfolio.value.id)
  }
}

// Load portfolio holdings for position management
async function loadPortfolioHoldings(portfolioId: string): Promise<void> {
  try {
    const response = await $fetch<{ success: boolean; data: { holdings: HoldingData[] } }>(`/api/portfolios/${portfolioId}/holdings`)
    portfolioHoldings.value = response.data.holdings
  } catch (error) {
    console.error('Error loading portfolio holdings:', error)
    portfolioHoldings.value = []
  }
}

// Load portfolio data (transactions and holdings)
async function loadPortfolioData(portfolioId: string): Promise<void> {
  try {
    // Get request headers for SSR authentication
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

    // Load transactions
    const transactionsResponse = await $fetch(`/api/portfolios/${portfolioId}/transactions`, {
      headers: headers as HeadersInit
    }) as { data: TransactionData[] }
    console.log('Transactions response:', transactionsResponse)
    portfolioTransactions.value = transactionsResponse.data || []
    console.log('Portfolio transactions set to:', portfolioTransactions.value)

    // Load holdings - note the different response structure
    const holdingsResponse = await $fetch(`/api/portfolios/${portfolioId}/holdings`, {
      headers: headers as HeadersInit
    }) as { data: { holdings: HoldingData[] } }
    console.log('Holdings response:', holdingsResponse)
    portfolioHoldings.value = holdingsResponse.data?.holdings || []
    console.log('Portfolio holdings set to:', portfolioHoldings.value)
  } catch (error) {
    console.error('Failed to load portfolio data:', error)
  }
}

// Submit new transaction
async function submitTransaction(): Promise<void> {
  console.log('=== submitTransaction called ===')
  console.log('selectedPortfolio:', selectedPortfolio.value)
  console.log('transactionForm:', transactionForm)
  
  if (!selectedPortfolio.value) {
    console.error('No selected portfolio')
    alert('No portfolio selected')
    return
  }

  // Basic form validation
  if (!transactionForm.symbol || !transactionForm.symbol.trim()) {
    console.error('Invalid symbol:', transactionForm.symbol)
    alert('Please enter a valid symbol')
    return
  }

  if (transactionForm.quantity <= 0) {
    console.error('Invalid quantity:', transactionForm.quantity)
    alert('Please enter a valid quantity greater than 0')
    return
  }

  if (transactionForm.price <= 0) {
    console.error('Invalid price:', transactionForm.price)
    alert('Please enter a valid price greater than 0')
    return
  }

  try {
    submittingTransaction.value = true
    console.log('Starting transaction submission...')

    // Get request headers for both SSR and client-side authentication
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

    const transactionData = {
      symbol: transactionForm.symbol.toUpperCase(),
      isin: transactionForm.isin || undefined,
      type: transactionForm.type,
      quantity: transactionForm.quantity,
      price: transactionForm.price,
      fees: transactionForm.fees || 0,
      date: transactionForm.date,
      notes: transactionForm.notes || undefined
    }

    console.log('Transaction data to submit:', transactionData)

    if (editingTransaction.value) {
      // Update existing transaction
      console.log('Updating transaction with ID:', editingTransaction.value.id)
      await $fetch(`/api/portfolios/${selectedPortfolio.value.id}/transactions/${editingTransaction.value.id}`, {
        method: 'PUT' as const,
        headers: headers as HeadersInit,
        body: transactionData
      })
    } else {
      // Create new transaction
      console.log('Creating new transaction for portfolio:', selectedPortfolio.value.id)
      await $fetch(`/api/portfolios/${selectedPortfolio.value.id}/transactions`, {
        method: 'POST' as const,
        headers: headers as HeadersInit,
        body: transactionData
      })
    }

    console.log('Transaction submitted successfully')

    // Reload portfolio data
    await loadPortfolioData(selectedPortfolio.value.id)

    // Reset form
    cancelAddTransaction()
  } catch (error) {
    console.error(`Failed to ${editingTransaction.value ? 'update' : 'create'} transaction:`, error)
    alert(`Failed to ${editingTransaction.value ? 'update' : 'create'} transaction. Please try again.`)
  } finally {
    submittingTransaction.value = false
  }
}

// Debug function to handle submit button click
function handleSubmitClick(event: Event): void {
  console.log('Submit button clicked!', event)
  console.log('selectedPortfolio at button click:', selectedPortfolio.value)
  console.log('showTransactionModal:', showTransactionModal.value)
  console.log('showAddTransactionForm:', showAddTransactionForm.value)
  console.log('Form data:', {
    symbol: transactionForm.symbol,
    quantity: transactionForm.quantity,
    price: transactionForm.price,
    submittingTransaction: submittingTransaction.value
  })
  
  // Don't prevent default since we want the form submission to happen
}

// Edit transaction
function editTransaction(transaction: TransactionData): void {
  editingTransaction.value = transaction
  transactionForm.symbol = transaction.symbol
  transactionForm.isin = transaction.isin || ''
  transactionForm.type = transaction.type
  transactionForm.quantity = transaction.quantity
  transactionForm.price = transaction.price
  transactionForm.fees = transaction.fees
  // Format date for HTML date input (YYYY-MM-DD)
  transactionForm.date = transaction.date ? transaction.date.split('T')[0] : ''
  transactionForm.notes = transaction.notes || ''
  transactionForm.currency = transaction.currency || selectedPortfolio.value?.currency || 'NOK'
  showAddTransactionForm.value = true
}

// Delete transaction
async function deleteTransaction(transaction: TransactionData): Promise<void> {
  if (!selectedPortfolio.value) return

  if (confirm(`Are you sure you want to delete this ${transaction.type} transaction for ${transaction.symbol}?`)) {
    try {
      // Get request headers for SSR authentication
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : {}

      await $fetch(`/api/portfolios/${selectedPortfolio.value.id}/transactions/${transaction.id}`, {
        method: 'DELETE' as const,
        headers: headers as HeadersInit
      })

      // Reload portfolio data
      await loadPortfolioData(selectedPortfolio.value.id)
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      alert('Failed to delete transaction. Please try again.')
    }
  }
}

// Delete portfolio
async function deletePortfolio(portfolio: Portfolio): Promise<void> {
  if (confirm(`Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`)) {
    try {
      await portfolioStore.deletePortfolio(portfolio.id)
    } catch (error) {
      console.error('Failed to delete portfolio:', error)
      alert('Failed to delete portfolio. Please try again.')
    }
  }
}

// Edit portfolio
function editPortfolio(portfolio: Portfolio): void {
  editingPortfolio.value = portfolio
  form.name = portfolio.name
  form.description = portfolio.description || ''
  form.isDefault = portfolio.isDefault
  form.currency = portfolio.currency || 'NOK'
}

// Format currency - using useCurrency composable above

// Calculate transaction total with fees
function calculateTransactionTotal(transaction: TransactionData): number {
  const amount = transaction.quantity * transaction.price
  const fees = transaction.fees || 0

  // For purchases (BUY), total is amount + fees (money going out)
  // For sales (SELL), total is amount - fees (money coming in)
  // For other types, follow the same logic based on cash flow direction

  switch (transaction.type) {
    case 'BUY':
    case 'RIGHTS_ALLOCATION':
    case 'RIGHTS_ISSUE':
      // Money going out (amount + fees)
      return amount + fees

    case 'SELL':
    case 'DIVIDEND':
    case 'DIVIDEND_REINVEST':
    case 'DEPOSIT':
    case 'REFUND':
    case 'LIQUIDATION':
    case 'REDEMPTION':
    case 'DECIMAL_LIQUIDATION':
    case 'SPIN_OFF_IN':
    case 'TRANSFER_IN':
    case 'EXCHANGE_IN':
      // Money coming in (amount - fees)
      return amount - fees

    case 'WITHDRAWAL':
    case 'DECIMAL_WITHDRAWAL':
    case 'INTEREST_CHARGE':
    case 'EXCHANGE_OUT':
      // Money going out (amount + fees)
      return amount + fees

    default:
      // For unknown types, just show amount - fees
      return amount - fees
  }
}

// Submit form
async function submitForm(): Promise<void> {
  try {
    submitting.value = true
    console.log('Submitting form for portfolio:', editingPortfolio.value ? 'update' : 'create')

    if (editingPortfolio.value) {
      // Update existing portfolio using the store method
      console.log('Updating portfolio with data:', {
        name: form.name,
        description: form.description || undefined,
        isDefault: form.isDefault
      })

      const result = await portfolioStore.updatePortfolio(editingPortfolio.value.id, {
        name: form.name,
        description: form.description || undefined,
        isDefault: form.isDefault
      })

      console.log('Portfolio updated successfully:', result)
    } else {
      // Create new portfolio
      console.log('Creating portfolio with data:', {
        name: form.name,
        description: form.description || undefined,
        isDefault: form.isDefault
      })

      const result = await portfolioStore.createPortfolio({
        name: form.name,
        description: form.description || undefined,
        isDefault: form.isDefault
      })

      console.log('Portfolio created successfully:', result)
    }

    console.log('Form submission successful, closing modal')
    closeModal()
  } catch (error) {
    console.error('Failed to save portfolio:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    alert('Failed to save portfolio. Please try again.')
  } finally {
    submitting.value = false
  }
}

// Get transaction type class
function getTransactionTypeClass(type: string): string {
  switch (type) {
    case 'BUY':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'SELL':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 'DIVIDEND':
    case 'DIVIDEND_REINVEST':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    case 'DEPOSIT':
    case 'TRANSFER_IN':
    case 'REFUND':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
    case 'WITHDRAWAL':
    case 'INTEREST_CHARGE':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 'SPLIT':
    case 'SPIN_OFF_IN':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    case 'MERGER':
    case 'EXCHANGE_IN':
    case 'EXCHANGE_OUT':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    case 'LIQUIDATION':
    case 'REDEMPTION':
    case 'DECIMAL_LIQUIDATION':
    case 'DECIMAL_WITHDRAWAL':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'RIGHTS_ALLOCATION':
    case 'RIGHTS_ISSUE':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
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

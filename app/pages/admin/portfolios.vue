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
  </div>
</template>

<script setup lang="ts">
import type { Portfolio } from '~/stores/portfolio'
import {
  ChartBarIcon,
  LockClosedIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'

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

// Form data
const form = reactive({
  name: '',
  description: '',
  isDefault: false
})

// Reset form
function resetForm(): void {
  form.name = ''
  form.description = ''
  form.isDefault = false
}

// Close modal
function closeModal(): void {
  showCreateModal.value = false
  editingPortfolio.value = null
  resetForm()
}

// Edit portfolio
function editPortfolio(portfolio: Portfolio): void {
  editingPortfolio.value = portfolio
  form.name = portfolio.name
  form.description = portfolio.description || ''
  form.isDefault = portfolio.isDefault
}

// Delete portfolio
function deletePortfolio(portfolio: Portfolio): void {
  if (confirm(`Are you sure you want to delete "${portfolio.name}"? This action cannot be undone.`)) {
    // TODO: Implement delete functionality
    console.log('Delete portfolio:', portfolio.id)
  }
}

// Submit form
async function submitForm(): Promise<void> {
  try {
    submitting.value = true
    
    if (editingPortfolio.value) {
      // TODO: Implement update functionality
      console.log('Update portfolio:', editingPortfolio.value.id, form)
    } else {
      await portfolioStore.createPortfolio({
        name: form.name,
        description: form.description || undefined,
        isDefault: form.isDefault
      })
    }
    
    closeModal()
  } catch (error) {
    console.error('Failed to save portfolio:', error)
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

<template>
  <!-- Modal Backdrop -->
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex min-h-screen items-center justify-center px-4 py-6">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="handleCancel" />
      
      <!-- Modal Content -->
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Import Transactions from CSV
          </h3>
        </div>

        <!-- Body -->
        <div class="px-6 py-4 space-y-6">
          <!-- File Upload -->
          <div v-if="!importResult">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="file-upload">
                CSV File <span class="text-red-500">*</span>
              </label>
              <div class="space-y-3">
                <input
                  id="file-upload"
                  ref="fileInput"
                  type="file"
                  accept=".csv,.txt"
                  class="block w-full text-sm text-gray-500 dark:text-gray-400
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-medium
                         file:bg-primary-50 file:text-primary-700
                         hover:file:bg-primary-100
                         dark:file:bg-primary-900 dark:file:text-primary-300
                         dark:hover:file:bg-primary-800"
                  @change="handleFileSelect"
                >
                
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  <p class="font-medium mb-2">Supported format:</p>
                  <ul class="list-disc list-inside space-y-1 text-xs">
                    <li>Norwegian brokerage CSV export (tab-separated)</li>
                    <li>Must include headers: Bokføringsdag, Transaksjonstype, Verdipapir, Antall, Kurs, etc.</li>
                    <li>Supported transaction types: KJØPT, SALG, UTBYTTE</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- Preview -->
            <div v-if="previewData.length > 0" class="mt-6">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Preview (first 5 rows):
              </h4>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead class="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                        Date
                      </th>
                      <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                        Type
                      </th>
                      <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                        Symbol
                      </th>
                      <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                        Quantity
                      </th>
                      <th class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="(row, index) in previewData.slice(0, 5)" :key="index">
                      <td class="px-3 py-2 text-xs text-gray-900 dark:text-white">
                        {{ row.date }}
                      </td>
                      <td class="px-3 py-2 text-xs text-gray-900 dark:text-white">
                        {{ row.type }}
                      </td>
                      <td class="px-3 py-2 text-xs text-gray-900 dark:text-white">
                        {{ row.symbol }}
                      </td>
                      <td class="px-3 py-2 text-xs text-gray-900 dark:text-white">
                        {{ row.quantity }}
                      </td>
                      <td class="px-3 py-2 text-xs text-gray-900 dark:text-white">
                        {{ row.price }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {{ previewData.length }} transactions found
              </p>
            </div>
          </div>

          <!-- Import Result -->
                        <div v-else class="text-center">
                <div class="inline-flex items-center p-2 rounded-full mb-4" :class="importResult.success ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'">
                  <CheckCircleIcon v-if="importResult.success" class="w-6 h-6 text-green-600 dark:text-green-400" />
                  <XCircleIcon v-else class="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {{ importResult.success ? 'Import Completed' : 'Import Failed' }}
                </h3>
                <div class="text-left bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <p class="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm">
                    {{ importResult.message }}
                  </p>
                  <div v-if="importResult.data" class="mt-4">
                    <div v-if="importResult.data.errors && importResult.data.errors.length > 0" class="mt-2">
                      <p class="font-medium text-red-600 dark:text-red-400"><strong>Detailed Errors:</strong></p>
                      <ul class="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300">
                        <li v-for="error in importResult.data.errors" :key="error" class="mb-1">{{ error }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button 
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            @click="handleCancel"
          >
            {{ importResult ? 'Close' : 'Cancel' }}
          </button>
          <button 
            v-if="!importResult && csvData"
            type="button" 
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed border border-transparent rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center space-x-2"
            @click="handleImport"
          >
            <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{{ loading ? 'Importing...' : 'Import Transactions' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'

const isOpen = defineModel<boolean>({ type: Boolean, default: false })
const emit = defineEmits<{
  success: []
}>()

const loading = ref(false)
const csvData = ref<string>('')
const previewData = ref<PreviewRow[]>([])
const importResult = ref<ImportResult | null>(null)
const fileInput = ref<HTMLInputElement>()

interface PreviewRow {
  date: string
  type: string
  symbol: string
  quantity: string
  price: string
}

interface ImportResult {
  success: boolean
  message: string
  data?: {
    imported: number
    skipped: number
    errors?: string[]
  }
}

const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  
  while (i < line.length) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 2
      } else {
        inQuotes = !inQuotes
        i++
      }
    } else if (char === '\t' && !inQuotes) {
      result.push(current.trim())
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }
  
  result.push(current.trim())
  return result
}

const handleFileSelect = (event: Event): void => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    csvData.value = content
    parsePreview(content)
  }
  reader.readAsText(file)
}

const parsePreview = (content: string): void => {
  try {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) return

    const headers = parseCSVLine(lines[0] || '')
    const preview: PreviewRow[] = []

    for (let i = 1; i < Math.min(lines.length, 21); i++) {
      const values = parseCSVLine(lines[i] || '')
      if (values.length !== headers.length) continue

      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      // Only include rows with securities
      if (row.Verdipapir && row.Verdipapir.trim() !== '') {
        preview.push({
          date: row.Bokføringsdag || '',
          type: row.Transaksjonstype || '',
          symbol: row.Verdipapir || '',
          quantity: row.Antall || '',
          price: row.Kurs || ''
        })
      }
    }

    previewData.value = preview
  } catch (error) {
    console.error('Failed to parse preview:', error)
    previewData.value = []
  }
}

const handleImport = async (): Promise<void> => {
  if (!csvData.value) return

  try {
    loading.value = true
    const portfolioStore = usePortfolioStore()
    const currentPortfolio = portfolioStore.currentPortfolio
    
    if (!currentPortfolio) {
      throw new Error('No portfolio selected')
    }

    // Check if user is authenticated
    const { loggedIn } = useAuthorization()
    if (!loggedIn.value) {
      throw new Error('Please log in to import transactions')
    }

    console.log('Starting import for portfolio:', currentPortfolio.id)
    console.log('CSV data length:', csvData.value.length)

    const result = await $fetch(`/api/portfolios/${currentPortfolio.id}/transactions/import`, {
      method: 'POST',
      body: {
        csvData: csvData.value
      }
    }) as ImportResult

    console.log('Import result:', result)
    importResult.value = result
    
    if (result.success) {
      // Refresh the portfolio data
      await portfolioStore.fetchPortfolios()
      emit('success')
    }
  } catch (error: unknown) {
    console.error('Import error:', error)
    
    let errorMessage = 'Failed to import transactions'
    
    // Handle different types of errors
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      // Handle fetch errors with response data
      const fetchError = error as { data?: { message?: string }, statusMessage?: string, statusCode?: number }
      if (fetchError.data && fetchError.data.message) {
        errorMessage = fetchError.data.message
      } else if (fetchError.statusMessage) {
        errorMessage = `${fetchError.statusMessage} (${fetchError.statusCode})`
      }
    }

    importResult.value = {
      success: false,
      message: errorMessage
    }
  } finally {
    loading.value = false
  }
}

const handleCancel = (): void => {
  resetForm()
  isOpen.value = false
}

const resetForm = (): void => {
  csvData.value = ''
  previewData.value = []
  importResult.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Reset form when modal closes
watch(isOpen, (newValue: boolean) => {
  if (!newValue) {
    resetForm()
  }
})
</script>

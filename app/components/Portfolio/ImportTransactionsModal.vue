<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-2xl' }">
    <UCard :ui="{ header: { padding: 'px-6 py-4' }, body: { padding: 'px-6 py-4' } }">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Import Transactions from CSV
        </h3>
      </template>

      <div class="space-y-6">
        <!-- File Upload -->
        <div v-if="!importResult">
          <UFormGroup label="CSV File" name="file" required>
            <div class="space-y-3">
              <input
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
          </UFormGroup>

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
        <div v-if="importResult" class="space-y-4">
          <div class="rounded-lg p-4" :class="importResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'">
            <div class="flex">
              <div class="flex-shrink-0">
                <CheckCircleIcon v-if="importResult.success" class="h-5 w-5 text-green-400" />
                <XCircleIcon v-else class="h-5 w-5 text-red-400" />
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium" :class="importResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'">
                  {{ importResult.success ? 'Import Completed' : 'Import Failed' }}
                </h3>
                <div class="mt-2 text-sm" :class="importResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
                  <p>{{ importResult.message }}</p>
                  <div v-if="importResult.data" class="mt-2">
                    <p><strong>Imported:</strong> {{ importResult.data.imported }} transactions</p>
                    <p><strong>Skipped:</strong> {{ importResult.data.skipped }} transactions</p>
                    <div v-if="importResult.data.errors && importResult.data.errors.length > 0" class="mt-2">
                      <p><strong>Errors:</strong></p>
                      <ul class="list-disc list-inside text-xs max-h-32 overflow-y-auto">
                        <li v-for="error in importResult.data.errors" :key="error">{{ error }}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton variant="ghost" @click="handleCancel">
            {{ importResult ? 'Close' : 'Cancel' }}
          </UButton>
          <UButton 
            v-if="!importResult && csvData"
            type="button" 
            :loading="loading"
            @click="handleImport"
          >
            Import Transactions
          </UButton>
        </div>
      </div>
    </UCard>
  </UModal>
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

    const result = await $fetch(`/api/portfolios/${currentPortfolio.id}/transactions/import`, {
      body: {
        csvData: csvData.value
      }
    }) as ImportResult

    importResult.value = result
    
    if (result.success) {
      // Refresh the portfolio data
      await portfolioStore.fetchPortfolios()
      emit('success')
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to import transactions'
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

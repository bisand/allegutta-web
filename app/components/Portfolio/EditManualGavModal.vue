<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Edit GAV - {{ holding?.symbol }}
          </h3>
          <button
            class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            @click="$emit('close')"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mb-6">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Current Position: {{ formatNumber(holding?.quantity || 0) }} shares
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Calculated GAV: {{ formatCurrency(holding?.avgPrice || 0, { currency: holding?.currency || 'NOK' }) }}
          </div>
          
          <!-- Manual GAV Toggle -->
          <div class="flex items-center mb-4">
            <input
              id="useManualGav"
              v-model="form.useManualAvgPrice"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
            >
            <label for="useManualGav" class="ml-2 block text-sm text-gray-900 dark:text-gray-100">
              Use manual GAV override
            </label>
          </div>

          <!-- Manual GAV Input -->
          <div v-if="form.useManualAvgPrice" class="space-y-4">
            <div>
              <label for="manualGav" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manual GAV ({{ holding?.currency || 'NOK' }})
              </label>
              <input
                id="manualGav"
                v-model.number="form.manualAvgPrice"
                type="number"
                step="0.0001"
                min="0"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-500 dark:border-red-400': errors.manualAvgPrice }"
                placeholder="Enter manual GAV"
              >
              <p v-if="errors.manualAvgPrice" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ errors.manualAvgPrice }}
              </p>
            </div>

            <div>
              <label for="reason" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason for manual GAV <span class="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea
                id="reason"
                v-model="form.reason"
                rows="3"
                maxlength="500"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-500 dark:border-red-400': errors.reason }"
                placeholder="Explain why manual GAV is needed (e.g., corporate action not handled correctly, data quality issues, etc.)"
              />
              <p v-if="errors.reason" class="mt-1 text-sm text-red-600 dark:text-red-400">
                {{ errors.reason }}
              </p>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ form.reason?.length || 0 }}/500 characters
              </p>
            </div>
          </div>

          <!-- Current Manual GAV Info -->
          <div v-if="holding?.useManualAvgPrice && !form.useManualAvgPrice" class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Currently using manual GAV
            </div>
            <div class="text-sm text-yellow-700 dark:text-yellow-300">
              Manual GAV: {{ formatCurrency(holding.manualAvgPrice || 0, { currency: holding.currency || 'NOK' }) }}
            </div>
            <div class="text-sm text-yellow-700 dark:text-yellow-300">
              Reason: {{ holding.manualAvgPriceReason }}
            </div>
            <div class="text-sm text-yellow-600 dark:text-yellow-400">
              Set on: {{ formatDate(holding.manualAvgPriceDate) }}
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-3">
          <button
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-gray-400 disabled:opacity-50"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            :disabled="loading || !isValid"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            @click="saveManualGav"
          >
            <span v-if="loading">Saving...</span>
            <span v-else>{{ form.useManualAvgPrice ? 'Set Manual GAV' : 'Disable Manual GAV' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCurrency } from '~/composables/useCurrency'
import { useDateTime } from '~/composables/useDateTime'

interface Holding {
  id: string
  portfolioId: string
  symbol: string
  quantity: number
  avgPrice: number
  manualAvgPrice?: number | null
  useManualAvgPrice?: boolean
  manualAvgPriceReason?: string | null
  manualAvgPriceDate?: string | null
  currency: string
}

interface Props {
  holding: Holding | null
  portfolioId: string
}

interface Emits {
  (e: 'close' | 'updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { formatCurrency, formatNumber } = useCurrency()
const { formatDate } = useDateTime()

const loading = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref({
  useManualAvgPrice: false,
  manualAvgPrice: 0,
  reason: ''
})

// Initialize form when holding changes
watch(() => props.holding, (holding) => {
  if (holding) {
    form.value = {
      useManualAvgPrice: holding.useManualAvgPrice || false,
      manualAvgPrice: holding.manualAvgPrice || holding.avgPrice || 0,
      reason: holding.manualAvgPriceReason || ''
    }
  }
}, { immediate: true })

const isValid = computed(() => {
  if (!form.value.useManualAvgPrice) return true
  return form.value.manualAvgPrice > 0 && form.value.reason.trim().length > 0
})

function validateForm(): boolean {
  errors.value = {}

  if (form.value.useManualAvgPrice) {
    if (!form.value.manualAvgPrice || form.value.manualAvgPrice <= 0) {
      errors.value.manualAvgPrice = 'Manual GAV must be greater than 0'
    }

    if (!form.value.reason.trim()) {
      errors.value.reason = 'Reason is required when using manual GAV'
    } else if (form.value.reason.trim().length < 10) {
      errors.value.reason = 'Reason must be at least 10 characters'
    }
  }

  return Object.keys(errors.value).length === 0
}

async function saveManualGav() {
  if (!validateForm() || !props.holding) return

  loading.value = true
  try {
    const response = await $fetch<{ success: boolean }>(`/api/portfolios/${props.portfolioId}/holdings/${props.holding.symbol}/manual-gav`, {
      method: 'PUT',
      body: {
        useManualAvgPrice: form.value.useManualAvgPrice,
        manualAvgPrice: form.value.useManualAvgPrice ? form.value.manualAvgPrice : undefined,
        reason: form.value.useManualAvgPrice ? form.value.reason : undefined
      }
    })

    if (response.success) {
      emit('updated')
      emit('close')
    }
  } catch (error: unknown) {
    console.error('Error saving manual GAV:', error)
    
    // Show validation errors if any
    const errorData = error as { data?: { data?: Array<{ path: string[]; message: string }>, message?: string } }
    if (errorData.data?.data) {
      const validationErrors: Record<string, string> = {}
      for (const err of errorData.data.data) {
        const fieldName = err.path[0]
        if (fieldName) {
          validationErrors[fieldName] = err.message
        }
      }
      errors.value = validationErrors
    } else {
      errors.value.general = errorData.data?.message || 'Failed to save manual GAV'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model="isOpen">
    <UCard :ui="{ header: { padding: 'px-6 py-4' }, body: { padding: 'px-6 py-4' } }">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Add Transaction
        </h3>
      </template>
      
      <UForm :state="form" :schema="schema" class="space-y-4" @submit="handleSubmit">
        <UFormGroup label="Symbol" name="symbol" required>
          <UInput 
            v-model="form.symbol" 
            placeholder="e.g. AAPL, TSLA"
            :uppercase="true"
          />
        </UFormGroup>

        <UFormGroup label="Type" name="type" required>
          <USelectMenu
            v-model="form.type"
            :options="transactionTypes"
            placeholder="Select transaction type"
          />
        </UFormGroup>

        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Quantity" name="quantity" required>
            <UInput 
              v-model="form.quantity" 
              type="number"
              step="0.0001"
              placeholder="0.00"
            />
          </UFormGroup>

          <UFormGroup label="Price" name="price" required>
            <UInput 
              v-model="form.price" 
              type="number"
              step="0.01"
              placeholder="0.00"
            >
              <template #leading>
                <span class="text-gray-500 dark:text-gray-400 text-sm">$</span>
              </template>
            </UInput>
          </UFormGroup>
        </div>

        <UFormGroup label="Fees" name="fees">
          <UInput 
            v-model="form.fees" 
            type="number"
            step="0.01"
            placeholder="0.00"
          >
            <template #leading>
              <span class="text-gray-500 dark:text-gray-400 text-sm">$</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup label="Date" name="date" required>
          <UInput 
            v-model="form.date" 
            type="date"
          />
        </UFormGroup>

        <UFormGroup label="Notes" name="notes">
          <UTextarea 
            v-model="form.notes" 
            placeholder="Optional notes about this transaction"
            :rows="3"
          />
        </UFormGroup>

        <div class="flex justify-end space-x-3 pt-4">
          <UButton variant="ghost" @click="handleCancel">
            Cancel
          </UButton>
          <UButton type="submit" :loading="loading">
            Add Transaction
          </UButton>
        </div>
      </UForm>
    </UCard>
  </UModal>
</template>

<script setup>
import { z } from 'zod'

const isOpen = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['success'])

const loading = ref(false)

const transactionTypes = [
  { label: 'Buy', value: 'BUY' },
  { label: 'Sell', value: 'SELL' },
  { label: 'Dividend', value: 'DIVIDEND' },
  { label: 'Stock Split', value: 'SPLIT' },
  { label: 'Merger', value: 'MERGER' }
]

const schema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(10),
  type: z.enum(['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'MERGER']),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  fees: z.number().min(0, 'Fees cannot be negative').optional(),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional()
})

const form = reactive({
  symbol: '',
  type: 'BUY',
  quantity: null,
  price: null,
  fees: 0,
  date: new Date().toISOString().split('T')[0],
  notes: ''
})

const resetForm = () => {
  Object.assign(form, {
    symbol: '',
    type: 'BUY',
    quantity: null,
    price: null,
    fees: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
}

const handleCancel = () => {
  resetForm()
  isOpen.value = false
}

const handleSubmit = async () => {
  try {
    loading.value = true
    
    // Add the transaction via the portfolio store
    const portfolioStore = usePortfolioStore()
    await portfolioStore.addTransaction({
      ...form,
      quantity: Number(form.quantity),
      price: Number(form.price),
      fees: Number(form.fees) || 0
    })
    
    resetForm()
    isOpen.value = false
    emit('success')
  } catch (error) {
    console.error('Failed to add transaction:', error)
  } finally {
    loading.value = false
  }
}

// Reset form when modal closes
watch(isOpen, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})
</script>

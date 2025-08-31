<template>
  <UModal v-model="isOpen">
    <UCard :ui="{ header: { padding: 'px-6 py-4' }, body: { padding: 'px-6 py-4' } }">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Create Portfolio
        </h3>
      </template>
      
      <UForm :state="form" :schema="schema" class="space-y-4" @submit="handleSubmit">
        <UFormGroup label="Portfolio Name" name="name" required>
          <UInput 
            v-model="form.name" 
            placeholder="e.g. Main Portfolio, Growth Stocks"
          />
        </UFormGroup>

        <UFormGroup label="Description" name="description">
          <UTextarea 
            v-model="form.description" 
            placeholder="Optional description of this portfolio"
            :rows="3"
          />
        </UFormGroup>

        <UFormGroup label="Set as Default" name="isDefault">
          <UCheckbox 
            v-model="form.isDefault" 
            label="Make this my default portfolio"
          />
        </UFormGroup>

        <div class="flex justify-end space-x-3 pt-4">
          <UButton variant="ghost" @click="handleCancel">
            Cancel
          </UButton>
          <UButton type="submit" :loading="loading">
            Create Portfolio
          </UButton>
        </div>
      </UForm>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'

const isOpen = defineModel<boolean>({ type: Boolean, default: false })
const emit = defineEmits<{
  success: []
}>()

const loading = ref(false)

const schema = z.object({
  name: z.string().min(1, 'Portfolio name is required').max(100),
  description: z.string().optional(),
  isDefault: z.boolean().optional()
})

interface PortfolioForm {
  name: string
  description: string
  isDefault: boolean
}

const form = reactive<PortfolioForm>({
  name: '',
  description: '',
  isDefault: false
})

const resetForm = (): void => {
  Object.assign(form, {
    name: '',
    description: '',
    isDefault: false
  })
}

const handleCancel = (): void => {
  resetForm()
  isOpen.value = false
}

const handleSubmit = async (): Promise<void> => {
  try {
    loading.value = true
    
    // Create the portfolio via the portfolio store
    const portfolioStore = usePortfolioStore()
    await portfolioStore.createPortfolio(form)
    
    resetForm()
    isOpen.value = false
    emit('success')
  } catch (error) {
    console.error('Failed to create portfolio:', error)
  } finally {
    loading.value = false
  }
}

// Reset form when modal closes
watch(isOpen, (newValue: boolean) => {
  if (!newValue) {
    resetForm()
  }
})
</script>

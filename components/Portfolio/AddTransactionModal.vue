<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Add Transaction
        </h3>
      </template>
      
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          Transaction form will be implemented here.
        </p>
        
        <div class="flex justify-end space-x-3">
          <UButton variant="ghost" @click="isOpen = false">
            Cancel
          </UButton>
          <UButton @click="handleSubmit">
            Add Transaction
          </UButton>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup>
const isOpen = defineModel({ type: Boolean, default: false })

defineEmits(['success'])

function handleSubmit() {
  // TODO: Implement transaction submission
  console.log('Add transaction submitted')
  isOpen.value = false
}
</script>

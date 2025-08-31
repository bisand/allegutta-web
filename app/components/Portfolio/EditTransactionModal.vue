<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Edit Transaction
        </h3>
      </template>
      
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          Transaction editing form will be implemented here.
        </p>
        <p v-if="transaction" class="text-sm text-gray-500">
          Editing: {{ transaction.symbol }} - {{ transaction.type }}
        </p>
        
        <div class="flex justify-end space-x-3">
          <UButton variant="ghost" @click="isOpen = false">
            Cancel
          </UButton>
          <UButton @click="handleSubmit">
            Update Transaction
          </UButton>
        </div>
      </div>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel({ type: Boolean, default: false })

defineProps({
  transaction: {
    type: Object,
    default: null
  }
})

defineEmits(['success'])

function handleSubmit() {
  // TODO: Implement transaction update
  console.log('Update transaction submitted')
  isOpen.value = false
}
</script>

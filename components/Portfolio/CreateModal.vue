<template>
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Create Portfolio
        </h3>
      </template>
      
      <div class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          Portfolio creation form will be implemented here.
        </p>
        
        <div class="flex justify-end space-x-3">
          <UButton variant="ghost" @click="isOpen = false">
            Cancel
          </UButton>
          <UButton @click="handleSubmit">
            Create Portfolio
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
  // TODO: Implement portfolio creation
  console.log('Create portfolio submitted')
  isOpen.value = false
}
</script>

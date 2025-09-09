<template>
  <div :class="containerClass">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ title }}</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  title: { type: String, required: true },
  variant: { type: String, default: 'default' }
})

const containerClass = computed(() => {
  if (props.variant === 'gradient') return 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 mb-8'
  return 'bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8'
})
</script>

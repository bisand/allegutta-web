<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div class="max-w-md w-full space-y-8 p-8">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v6m0 8v6m10-12h-6M4 12h6" />
          </svg>
        </div>
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          {{ $t('offline.title', 'You are offline') }}
        </h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ $t('offline.message', 'Please check your internet connection and try again.') }}
        </p>
      </div>
      
      <div class="mt-8 space-y-4">
        <button
          :disabled="isRetrying"
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="reload"
        >
          <span v-if="!isRetrying">{{ $t('offline.retry', 'Try Again') }}</span>
          <span v-else class="flex items-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {{ $t('offline.retrying', 'Retrying...') }}
          </span>
        </button>
        
        <NuxtLink
          to="/"
          class="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {{ $t('offline.home', 'Go to Home') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Define page meta
definePageMeta({
  layout: false
})

// Define head
useHead({
  title: 'Offline - AlleGutta Portfolio'
})

// Reactive state
const isRetrying = ref(false)

// Functions
const reload = async () => {
  isRetrying.value = true
  
  try {
    // Wait a bit to show the loading state
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Try to reload the page
    window.location.reload()
  } catch (error) {
    console.error('Reload failed:', error)
    isRetrying.value = false
  }
}

// Check for online status
const updateOnlineStatus = () => {
  if (navigator.onLine) {
    // User is back online, redirect to home
    navigateTo('/')
  }
}

// Listen for online events
onMounted(() => {
  window.addEventListener('online', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
})
</script>
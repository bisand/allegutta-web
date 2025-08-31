<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="text-center">
      <div v-if="isLoading" class="space-y-4">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary mx-auto" />
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          Completing authentication...
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Please wait while we sign you in.
        </p>
      </div>
      
      <div v-else-if="error" class="space-y-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mx-auto" />
        <h1 class="text-xl font-semibold text-red-600">
          Authentication Error
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ error }}
        </p>
        <UButton @click="$router.push('/')">
          Return Home
        </UButton>
      </div>
      
      <div v-else class="space-y-4">
        <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-500 mx-auto" />
        <h1 class="text-xl font-semibold text-green-600">
          Authentication Successful
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Redirecting to your portfolio...
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false
})

const { checkAuth } = useKindeAuth()
const router = useRouter()

const isLoading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    // Handle the authentication callback
    if (import.meta.client && window.location.search.includes('code=')) {
      // Let Kinde handle the callback
      await checkAuth()
      
      // Redirect to portfolio after successful auth
      setTimeout(() => {
        router.push('/portfolio')
      }, 2000)
    } else {
      // No auth code, redirect to home
      router.push('/')
    }
  } catch (err) {
    error.value = err.message || 'Authentication failed'
  } finally {
    isLoading.value = false
  }
})

useHead({
  title: 'Authentication Callback'
})
</script>

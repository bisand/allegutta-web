<template>
  <div>
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NuxtPage />
    </main>
    <AppFooter />
    <!-- Toast notifications can be added later with a custom implementation -->
  </div>
</template>

<script setup lang="ts">
// Global app setup
useHead({
  titleTemplate: '%s - AlleGutta Portfolio'
})

// Initialize Pinia store
const portfolioStore = usePortfolioStore()

onMounted(() => {
  // Initialize portfolio store (will fetch public portfolios and user data if authenticated)
  portfolioStore.initialize()
})
</script>

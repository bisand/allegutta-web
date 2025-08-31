<template>
  <div>
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main class="min-h-screen">
      <NuxtPage />
    </main>
    <AppFooter />
    <UNotifications />
  </div>
</template>

<script setup>
// Global app setup
useHead({
  titleTemplate: '%s - AlleGutta Portfolio'
})

// Check if user is logged in
const { isAuthenticated } = useKindeAuth()

// Initialize Pinia store
const portfolioStore = usePortfolioStore()

onMounted(() => {
  // Initialize user portfolio if authenticated
  if (isAuthenticated.value) {
    portfolioStore.initializeUser()
  }
})
</script>

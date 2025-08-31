<template>
  <div>
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main class="min-h-screen">
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

// Check if user is logged in
const { loggedIn } = useAuth()

// Initialize Pinia store
const portfolioStore = usePortfolioStore()

onMounted(() => {
  // Initialize user portfolio if authenticated
  if (loggedIn.value) {
    portfolioStore.initializeUser()
  }
})
</script>

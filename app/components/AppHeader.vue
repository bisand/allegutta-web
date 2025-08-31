<template>
  <header class="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <UIcon name="i-heroicons-chart-bar" class="w-8 h-8 text-primary" />
            <span class="text-xl font-bold text-gray-900 dark:text-white">AlleGutta</span>
          </NuxtLink>
        </div>

        <!-- Navigation -->
        <div class="hidden md:block">
          <div class="ml-10 flex items-baseline space-x-4">
            <NuxtLink 
              to="/" 
              class="text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-primary"
            >
              Home
            </NuxtLink>
            <NuxtLink 
              v-if="isAuthenticated"
              to="/portfolio" 
              class="text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-primary"
            >
              Portfolio
            </NuxtLink>
            <NuxtLink 
              to="/about" 
              class="text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-primary"
            >
              About
            </NuxtLink>
          </div>
        </div>

        <!-- Right side actions -->
        <div class="flex items-center space-x-4">
          <!-- Dark mode toggle -->
          <UButton
            variant="ghost"
            size="sm"
            :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            aria-label="Toggle dark mode"
            @click="toggleDarkMode"
          />

          <!-- Authentication buttons -->
          <div v-if="!isAuthenticated" class="flex items-center space-x-2">
            <UButton 
              variant="ghost" 
              size="sm"
              @click="login"
            >
              Sign In
            </UButton>
            <UButton 
              size="sm"
              @click="register"
            >
              Sign Up
            </UButton>
          </div>

          <!-- User menu -->
          <UDropdown v-else :items="userMenuItems" :popper="{ placement: 'bottom-start' }">
            <UAvatar
              :src="user?.picture"
              :alt="userDisplayName"
              size="sm"
              class="cursor-pointer"
            />
          </UDropdown>

          <!-- Mobile menu button -->
          <UButton
            variant="ghost"
            size="sm"
            :icon="mobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
            class="md:hidden"
            aria-label="Toggle mobile menu"
            @click="mobileMenuOpen = !mobileMenuOpen"
          />
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="mobileMenuOpen" class="md:hidden">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
          <NuxtLink 
            to="/" 
            class="block text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-base font-medium transition-colors"
            @click="mobileMenuOpen = false"
          >
            Home
          </NuxtLink>
          <NuxtLink 
            v-if="isAuthenticated"
            to="/portfolio" 
            class="block text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-base font-medium transition-colors"
            @click="mobileMenuOpen = false"
          >
            Portfolio
          </NuxtLink>
          <NuxtLink 
            to="/about" 
            class="block text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-base font-medium transition-colors"
            @click="mobileMenuOpen = false"
          >
            About
          </NuxtLink>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup>
const { isAuthenticated, user, login, logout, register } = useKindeAuth()
const colorMode = useColorMode()
const mobileMenuOpen = ref(false)

const isDark = computed(() => colorMode.value === 'dark')

const userDisplayName = computed(() => {
  if (!user.value) return 'User'
  return user.value.given_name || user.value.email || 'User'
})

const userMenuItems = computed(() => [
  [{
    label: userDisplayName.value,
    slot: 'header',
    disabled: true
  }],
  [{
    label: 'Portfolio',
    icon: 'i-heroicons-chart-bar',
    to: '/portfolio'
  }, {
    label: 'Settings',
    icon: 'i-heroicons-cog-6-tooth',
    to: '/settings'
  }],
  [{
    label: 'Sign out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: logout
  }]
])

function toggleDarkMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Close mobile menu when clicking outside
onClickOutside(templateRef, () => {
  mobileMenuOpen.value = false
})
</script>

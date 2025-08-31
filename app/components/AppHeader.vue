<template>
  <header ref="headerRef" class="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <ChartBarIcon class="w-8 h-8 text-primary-500" />
            <span class="text-xl font-bold text-gray-900 dark:text-white">AlleGutta</span>
          </NuxtLink>
        </div>

        <!-- Navigation -->
        <div class="hidden md:block">
          <div class="ml-10 flex items-baseline space-x-4">
            <NuxtLink 
              to="/" 
              class="text-gray-900 dark:text-white hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-primary-500"
            >
              Home
            </NuxtLink>
            <NuxtLink 
              v-if="isAuthenticated"
              to="/portfolio" 
              class="text-gray-900 dark:text-white hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-primary-500"
            >
              Portfolio
            </NuxtLink>
            <NuxtLink 
              to="/about" 
              class="text-gray-900 dark:text-white hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-primary-500"
            >
              About
            </NuxtLink>
          </div>
        </div>

        <!-- Right side actions -->
        <div class="flex items-center space-x-4">
          <!-- Dark mode toggle -->
          <button
            type="button"
            class="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleDarkMode"
          >
            <SunIcon v-if="isDark" class="w-5 h-5" />
            <MoonIcon v-else class="w-5 h-5" />
          </button>

          <!-- Authentication buttons -->
          <div v-if="!isAuthenticated" class="flex items-center space-x-2">
            <button 
              type="button"
              class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              @click="login"
            >
              Sign In
            </button>
            <button 
              type="button"
              class="px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              @click="register"
            >
              Sign Up
            </button>
          </div>

          <!-- User menu -->
          <Menu v-else as="div" class="relative">
            <MenuButton class="flex items-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <img
                v-if="user?.picture"
                :src="user.picture"
                :alt="userDisplayName"
                class="w-8 h-8 rounded-full"
              >
              <div v-else class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <span class="text-sm font-medium text-white">{{ userDisplayName.charAt(0).toUpperCase() }}</span>
              </div>
            </MenuButton>
            
            <Transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <MenuItems class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100 dark:divide-gray-700">
                <div class="px-4 py-3">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ userDisplayName }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ user?.email }}</p>
                </div>
                
                <div class="py-1">
                  <MenuItem v-slot="{ active }">
                    <NuxtLink
                      to="/portfolio"
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                      ]"
                    >
                      <ChartBarIcon class="w-4 h-4 mr-3" />
                      Portfolio
                    </NuxtLink>
                  </MenuItem>
                  <MenuItem v-slot="{ active }">
                    <NuxtLink
                      to="/settings"
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                      ]"
                    >
                      <Cog6ToothIcon class="w-4 h-4 mr-3" />
                      Settings
                    </NuxtLink>
                  </MenuItem>
                </div>
                
                <div class="py-1">
                  <MenuItem v-slot="{ active }">
                    <button
                      type="button"
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                      ]"
                      @click="logout"
                    >
                      <ArrowRightOnRectangleIcon class="w-4 h-4 mr-3" />
                      Sign out
                    </button>
                  </MenuItem>
                </div>
              </MenuItems>
            </Transition>
          </Menu>

          <!-- Mobile menu button -->
          <button
            type="button"
            class="md:hidden p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle mobile menu"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <XMarkIcon v-if="mobileMenuOpen" class="w-5 h-5" />
            <Bars3Icon v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div v-if="mobileMenuOpen" class="md:hidden">
          <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
            <NuxtLink 
              to="/" 
              class="block text-gray-900 dark:text-white hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium transition-colors"
              @click="mobileMenuOpen = false"
            >
              Home
            </NuxtLink>
            <NuxtLink 
              v-if="isAuthenticated"
              to="/portfolio" 
              class="block text-gray-900 dark:text-white hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium transition-colors"
              @click="mobileMenuOpen = false"
            >
              Portfolio
            </NuxtLink>
            <NuxtLink 
              to="/about" 
              class="block text-gray-900 dark:text-white hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium transition-colors"
              @click="mobileMenuOpen = false"
            >
              About
            </NuxtLink>
          </div>
        </div>
      </Transition>
    </nav>
  </header>
</template>

<script setup>
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import {
  ChartBarIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'
import { onClickOutside } from '@vueuse/core'

const { isAuthenticated, user, login, logout, register } = useKindeAuth()
const colorMode = useColorMode()
const mobileMenuOpen = ref(false)
const headerRef = ref()

const isDark = computed(() => colorMode.value === 'dark')

const userDisplayName = computed(() => {
  if (!user.value) return 'User'
  return user.value.given_name || user.value.email || 'User'
})

function toggleDarkMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// Close mobile menu when clicking outside
onClickOutside(headerRef, () => {
  mobileMenuOpen.value = false
})
</script>

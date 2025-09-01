<template>
  <header ref="headerRef" class="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-50">
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
            
            <!-- Portfolios dropdown -->
            <Menu as="div" class="relative">
              <MenuButton class="flex items-center text-gray-900 dark:text-white hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Portfolios
                <ChevronDownIcon class="ml-1 w-4 h-4" />
              </MenuButton>
              
              <Transition
                enter-active-class="transition duration-100 ease-out"
                enter-from-class="transform scale-95 opacity-0"
                enter-to-class="transform scale-100 opacity-100"
                leave-active-class="transition duration-75 ease-in"
                leave-from-class="transform scale-100 opacity-100"
                leave-to-class="transform scale-95 opacity-0"
              >
                <MenuItems class="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100 dark:divide-gray-700 z-[60]">
                  <!-- When logged in: show portfolios -->
                  <template v-if="loggedIn">
                    <div class="py-1">
                      <!-- Portfolio list -->
                      <MenuItem 
                        v-for="portfolio in portfolioStore.allPortfolios" 
                        :key="portfolio.id" 
                        v-slot="{ active }"
                      >
                        <NuxtLink
                          :to="`/portfolio/${portfolio.id}`"
                          :class="[
                            active ? 'bg-gray-100 dark:bg-gray-700' : '',
                            'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                          ]"
                        >
                          <ChartBarIcon class="w-4 h-4 mr-3" />
                          {{ portfolio.name }}
                          <span v-if="portfolio.isDefault" class="ml-auto text-xs text-primary-500">(Default)</span>
                        </NuxtLink>
                      </MenuItem>
                      
                      <!-- Empty state -->
                      <div v-if="portfolioStore.allPortfolios.length === 0" class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        No portfolios available
                      </div>
                    </div>
                    
                    <!-- Admin actions -->
                    <div v-if="portfolioStore.canManagePortfolios" class="py-1">
                      <MenuItem v-slot="{ active }">
                        <NuxtLink
                          to="/admin/portfolios"
                          :class="[
                            active ? 'bg-gray-100 dark:bg-gray-700' : '',
                            'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                          ]"
                        >
                          <PlusIcon class="w-4 h-4 mr-3" />
                          Manage Portfolios
                        </NuxtLink>
                      </MenuItem>
                    </div>
                  </template>
                  
                  <!-- When not logged in: show login options -->
                  <template v-else>
                    <div class="py-1">
                      <div class="px-4 py-3">
                        <p class="text-sm font-medium text-gray-900 dark:text-white">Sign in to access your portfolios</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage your investments and track performance</p>
                      </div>
                    </div>
                    
                    <div class="py-1">
                      <MenuItem v-slot="{ active }">
                        <button
                          :class="[
                            active ? 'bg-gray-100 dark:bg-gray-700' : '',
                            'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 text-left'
                          ]"
                          @click="login"
                        >
                          <ArrowRightOnRectangleIcon class="w-4 h-4 mr-3" />
                          Sign In
                        </button>
                      </MenuItem>
                      
                      <MenuItem v-slot="{ active }">
                        <button
                          :class="[
                            active ? 'bg-gray-100 dark:bg-gray-700' : '',
                            'flex items-center w-full px-4 py-2 text-sm text-primary-600 dark:text-primary-400 text-left font-medium'
                          ]"
                          @click="register"
                        >
                          <PlusIcon class="w-4 h-4 mr-3" />
                          Create Account
                        </button>
                      </MenuItem>
                    </div>
                  </template>
                </MenuItems>
              </Transition>
            </Menu>
            
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
          <div v-if="!loggedIn" class="flex items-center space-x-2">
            <NuxtLink 
              to="/api/auth/login"
              external
              class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign In
            </NuxtLink>
            <NuxtLink 
              to="/api/auth/register"
              external
              class="px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
            >
              Sign Up
            </NuxtLink>
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
              <MenuItems class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100 dark:divide-gray-700 z-[60]">
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
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        'flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 text-left'
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
            
            <!-- Portfolios section -->
            <div v-if="loggedIn" class="space-y-1">
              <div class="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Portfolios
              </div>
              <NuxtLink 
                v-for="portfolio in portfolioStore.allPortfolios"
                :key="portfolio.id"
                :to="`/portfolio/${portfolio.id}`"
                class="block text-gray-700 dark:text-gray-300 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-6 py-2 rounded-md text-sm transition-colors"
                @click="mobileMenuOpen = false"
              >
                {{ portfolio.name }}
                <span v-if="portfolio.isDefault" class="ml-2 text-xs text-primary-500">(Default)</span>
              </NuxtLink>
              
              <!-- Empty state -->
              <div v-if="portfolioStore.allPortfolios.length === 0" class="px-6 py-2 text-sm text-gray-400 dark:text-gray-500">
                No portfolios available
              </div>
              
              <!-- Admin link -->
              <NuxtLink 
                v-if="portfolioStore.canManagePortfolios"
                to="/admin/portfolios"
                class="block text-gray-700 dark:text-gray-300 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-6 py-2 rounded-md text-sm transition-colors"
                @click="mobileMenuOpen = false"
              >
                Manage Portfolios
              </NuxtLink>
            </div>
            
            <!-- Authentication section for logged out users -->
            <div v-else class="space-y-1">
              <div class="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                Account
              </div>
              <button 
                class="block w-full text-left text-gray-700 dark:text-gray-300 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-6 py-2 rounded-md text-sm transition-colors"
                @click="login(); mobileMenuOpen = false"
              >
                Sign In
              </button>
              <button 
                class="block w-full text-left text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-6 py-2 rounded-md text-sm transition-colors"
                @click="register(); mobileMenuOpen = false"
              >
                Create Account
              </button>
            </div>
            
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

<script setup lang="ts">
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import {
  ChartBarIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'

const { loggedIn, user, login, register, logout } = useAppAuth()
const portfolioStore = usePortfolioStore()
const colorMode = useColorMode()
const mobileMenuOpen = ref(false)
const headerRef = ref()

const isDark = computed(() => colorMode.value === 'dark')

const userDisplayName = computed(() => {
  if (!user.value) return 'User'
  return user.value.name || user.value.firstName || user.value.email || 'User'
})

function toggleDarkMode(): void {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

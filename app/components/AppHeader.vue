<template>
  <header ref="headerRef" class="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 relative z-50">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <div class="flex items-center">
          <NuxtLink to="/" class="flex items-center space-x-2">
            <ChartBarIcon class="w-8 h-8 text-primary-500" />
            <span class="text-xl font-bold text-gray-900 dark:text-white">{{ $t('header.title') }}</span>
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
              {{ $t('common.home') }}
            </NuxtLink>
            
            <!-- Portfolios dropdown -->
            <Menu as="div" class="relative">
              <MenuButton class="flex items-center text-gray-900 dark:text-white hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                {{ $t('header.portfolios') }}
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
                  <!-- Portfolio list - always show -->
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
                        <span v-if="portfolio.isDefault" class="ml-auto text-xs text-primary-500">({{ $t('portfolio.default') }})</span>
                      </NuxtLink>
                    </MenuItem>
                    
                    <!-- Empty state -->
                    <div v-if="portfolioStore.allPortfolios.length === 0" class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {{ $t('portfolio.noPortfolios') }}
                    </div>
                  </div>
                  
                  <!-- Admin actions - only when logged in and has permissions -->
                  <ClientOnly>
                    <div v-if="loggedIn && portfolioStore.canManagePortfolios" class="py-1">
                      <MenuItem v-slot="{ active }">
                        <NuxtLink
                          to="/admin/portfolios"
                          :class="[
                            active ? 'bg-gray-100 dark:bg-gray-700' : '',
                            'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                          ]"
                        >
                          <PlusIcon class="w-4 h-4 mr-3" />
                          {{ $t('header.portfolioManagement') }}
                        </NuxtLink>
                      </MenuItem>
                    </div>
                  </ClientOnly>
                </MenuItems>
              </Transition>
            </Menu>

            <NuxtLink 
              to="/about" 
              class="text-gray-900 dark:text-white hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              active-class="text-primary-500"
            >
              {{ $t('common.about') }}
            </NuxtLink>
          </div>
        </div>

        <!-- Right side actions -->
        <div class="flex items-center space-x-4">
          <!-- Language switcher -->
          <Menu as="div" class="relative">
            <MenuButton class="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span class="text-sm font-medium">{{ locale.toUpperCase() }}</span>
            </MenuButton>
            
            <Transition
              enter-active-class="transition duration-100 ease-out"
              enter-from-class="transform scale-95 opacity-0"
              enter-to-class="transform scale-100 opacity-100"
              leave-active-class="transition duration-75 ease-in"
              leave-from-class="transform scale-100 opacity-100"
              leave-to-class="transform scale-95 opacity-0"
            >
              <MenuItems class="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[60]">
                <div class="py-1">
                  <MenuItem 
                    v-for="availableLocale in locales" 
                    :key="availableLocale.code"
                    v-slot="{ active }"
                  >
                    <NuxtLink
                      :to="switchLocalePath(availableLocale.code)"
                      :class="[
                        active ? 'bg-gray-100 dark:bg-gray-700' : '',
                        locale === availableLocale.code ? 'text-primary-500' : 'text-gray-700 dark:text-gray-200',
                        'flex items-center w-full px-4 py-2 text-sm text-left'
                      ]"
                    >
                      {{ availableLocale.name }}
                    </NuxtLink>
                  </MenuItem>
                </div>
              </MenuItems>
            </Transition>
          </Menu>

          <!-- Dark mode toggle -->
          <ClientOnly>
            <button
              type="button"
              class="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleDarkMode"
            >
              <SunIcon v-if="isDark" class="w-5 h-5" />
              <MoonIcon v-else class="w-5 h-5" />
            </button>
            <template #fallback>
              <button
                type="button"
                class="p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
                @click="toggleDarkMode"
              >
                <MoonIcon class="w-5 h-5" />
              </button>
            </template>
          </ClientOnly>

          <!-- Authentication buttons -->
          <ClientOnly>
            <template #default>
              <Transition
                enter-active-class="transition-opacity duration-200 ease-out"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div v-if="!$auth.loggedIn" class="flex items-center space-x-2">
                  <NuxtLink 
                    to="/api/auth/login?org_code=org_80fb5a68f571"
                    external
                    class="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {{ $t('common.login') }}
                  </NuxtLink>
                </div>

                <!-- User menu -->
                <Menu v-else-if="loggedIn" as="div" class="relative">
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
                            {{ $t('common.portfolio') }}
                          </NuxtLink>
                        </MenuItem>
                        
                        <!-- Admin: Edit Current Portfolio - show when admin and on portfolio page -->
                        <MenuItem 
                          v-if="canManagePortfolios"
                          v-slot="{ active }"
                        >
                          <NuxtLink
                            :to="`/admin/portfolios`"
                            :class="[
                              active ? 'bg-gray-100 dark:bg-gray-700' : '',
                              'flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200'
                            ]"
                          >
                            <PencilSquareIcon class="w-4 h-4 mr-3" />
                            {{ $t('header.editCurrentPortfolio') }}
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
                            {{ $t('header.settings') }}
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
                            {{ $t('header.signOut') }}
                          </button>
                        </MenuItem>
                      </div>
                    </MenuItems>
                  </Transition>
                </Menu>
              </Transition>
            </template>
            <template #fallback>
              <!-- Invisible placeholder to maintain layout -->
              <div class="flex items-center space-x-2 invisible">
                <div class="px-3 py-2 text-sm font-medium rounded-lg w-16 h-8" />
                <div class="px-3 py-2 text-sm font-medium rounded-lg w-20 h-8" />
              </div>
            </template>
          </ClientOnly>

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
              {{ $t('common.home') }}
            </NuxtLink>
            
            <!-- Portfolios section - always show -->
            <div class="space-y-1">
              <div class="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                {{ $t('header.portfolios') }}
              </div>
              <NuxtLink 
                v-for="portfolio in portfolioStore.allPortfolios"
                :key="portfolio.id"
                :to="`/portfolio/${portfolio.id}`"
                class="block text-gray-700 dark:text-gray-300 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-6 py-2 rounded-md text-sm transition-colors"
                @click="mobileMenuOpen = false"
              >
                {{ portfolio.name }}
                <span v-if="portfolio.isDefault" class="ml-2 text-xs text-primary-500">({{ $t('portfolio.default') }})</span>
              </NuxtLink>
              
              <!-- Empty state -->
              <div v-if="portfolioStore.allPortfolios.length === 0" class="px-6 py-2 text-sm text-gray-400 dark:text-gray-500">
                {{ $t('portfolio.noPortfolios') }}
              </div>
              
              <!-- Admin link - only when logged in and has permissions -->
              <ClientOnly>
                <NuxtLink 
                  v-if="loggedIn && portfolioStore.canManagePortfolios"
                  to="/admin/portfolios"
                  class="block text-gray-700 dark:text-gray-300 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-6 py-2 rounded-md text-sm transition-colors"
                  @click="mobileMenuOpen = false"
                >
                  {{ $t('header.portfolioManagement') }}
                </NuxtLink>
              </ClientOnly>
            </div>
            
            <!-- Authentication section - only when not logged in -->
            <ClientOnly>
              <div v-if="!loggedIn" class="space-y-1">
                <div class="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                  {{ $t('common.account') }}
                </div>
                <button 
                  class="block w-full text-left text-gray-700 dark:text-gray-300 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-6 py-2 rounded-md text-sm transition-colors"
                  @click="login(); mobileMenuOpen = false"
                >
                  {{ $t('common.login') }}
                </button>
              </div>
              <template #fallback>
                <!-- Minimal fallback that doesn't create visual shift -->
                <div class="h-0 opacity-0" />
              </template>
            </ClientOnly>
            
            <NuxtLink 
              to="/about" 
              class="block text-gray-900 dark:text-white hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-md text-base font-medium transition-colors"
              @click="mobileMenuOpen = false"
            >
              {{ $t('common.about') }}
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
  PlusIcon,
  PencilSquareIcon
} from '@heroicons/vue/24/outline'

const { loggedIn, user } = useAuth()
const { canManagePortfolios } = useAuthorization()
const portfolioStore = usePortfolioStore()
const colorMode = useColorMode()
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const mobileMenuOpen = ref(false)
const headerRef = ref()

const isDark = computed(() => colorMode.value === 'dark')

const userDisplayName = computed(() => {
  if (!user) return 'User'
  return user.given_name || user.email || 'User'
})

const login = async () => {
  await navigateTo('/api/auth/login', { external: true })
}

const logout = async () => {
  await navigateTo('/api/auth/logout', { external: true })
}

// Ensure portfolio store is initialized
onMounted(async () => {
  if (portfolioStore.publicPortfolios.length === 0) {
    await portfolioStore.initialize()
  }
})

function toggleDarkMode(): void {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

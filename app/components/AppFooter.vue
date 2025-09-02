<template>
  <footer class="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Logo and description -->
        <div class="col-span-1">
          <div class="flex items-center space-x-2 mb-4">
            <ChartBarIcon class="w-6 h-6 text-primary-500" />
            <span class="text-lg font-bold text-gray-900 dark:text-white">AlleGutta</span>
          </div>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            {{ $t('footer.description') }}
            {{ $t('common.managementDescription') }}
          </p>
        </div>

        <!-- Quick links -->
        <div class="col-span-1">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
            {{ $t('footer.quickLinks') }}
          </h3>
          <ul class="space-y-2">
            <li>
              <NuxtLink to="/" class="text-gray-600 dark:text-gray-400 hover:text-primary-500 text-sm transition-colors">
                {{ $t('common.home') }}
              </NuxtLink>
            </li>
            <li v-if="loggedIn">
              <NuxtLink to="/portfolio" class="text-gray-600 dark:text-gray-400 hover:text-primary-500 text-sm transition-colors">
                {{ $t('common.portfolio') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/about" class="text-gray-600 dark:text-gray-400 hover:text-primary-500 text-sm transition-colors">
                {{ $t('common.about') }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/privacy" class="text-gray-600 dark:text-gray-400 hover:text-primary-500 text-sm transition-colors">
                {{ $t('common.privacyPolicy') }}
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Contact info -->
        <div class="col-span-1">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
            Contact
          </h3>
          <div class="space-y-2">
            <p class="text-gray-600 dark:text-gray-400 text-sm flex items-center">
              <EnvelopeIcon class="w-4 h-4 mr-2" />
              support@allegutta.net
            </p>
            <p class="text-gray-600 dark:text-gray-400 text-sm flex items-center">
              <GlobeAltIcon class="w-4 h-4 mr-2" />
              allegutta.net
            </p>
          </div>
        </div>
      </div>

      <!-- Bottom section -->
      <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <p class="text-gray-500 dark:text-gray-400 text-sm">
            © {{ currentYear }} AlleGutta. All rights reserved.
          </p>
          <div class="flex items-center space-x-4 mt-4 md:mt-0">
            <span class="text-gray-500 dark:text-gray-400 text-sm">
              Made with ❤️ using Nuxt 4
            </span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ChartBarIcon, EnvelopeIcon, GlobeAltIcon } from '@heroicons/vue/24/outline'

const { loggedIn } = useAuth()

const currentYear = new Date().getFullYear()
</script>

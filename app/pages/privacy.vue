<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {{ $t('privacy.title') }}
        </h1>
        
        <div class="prose dark:prose-invert max-w-none">
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ $t('privacy.description') }}
          </p>
          
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
            {{ $t('privacy.informationWeCollect') }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ $t('privacy.informationWeCollectDescription') }}
          </p>
          
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
            {{ $t('privacy.howWeUseInfo') }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ $t('privacy.howWeUseInfoDescription') }}
          </p>
          
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
            {{ $t('privacy.dataSecurity') }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ $t('privacy.dataSecurityDescription') }}
          </p>
          
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">
            {{ $t('privacy.contactUs') }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            {{ $t('privacy.contactUsDescription') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Privacy Policy',
  meta: [
    { name: 'description', content: 'Privacy policy for AlleGutta Portfolio Manager' }
  ]
})
</script>

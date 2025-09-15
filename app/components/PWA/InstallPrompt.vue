<template>
  <div
    v-if="showInstallPrompt"
    class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border border-gray-200 dark:border-gray-700 z-50"
  >
    <div class="flex items-start space-x-3">
      <div class="flex-shrink-0">
        <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
      
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">
          {{ $t('pwa.install.title', 'Install AlleGutta Portfolio') }}
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ $t('pwa.install.description', 'Add this app to your home screen for quick access and offline use.') }}
        </p>
        
        <div class="flex space-x-2 mt-3">
          <button
            :disabled="isInstalling"
            class="px-3 py-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
            @click="installApp"
          >
            <span v-if="!isInstalling">{{ $t('pwa.install.install', 'Install') }}</span>
            <span v-else>{{ $t('pwa.install.installing', 'Installing...') }}</span>
          </button>
          
          <button
            class="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
            @click="dismissPrompt"
          >
            {{ $t('pwa.install.dismiss', 'Not now') }}
          </button>
        </div>
      </div>
      
      <button
        class="flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
        @click="dismissPrompt"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component state
const showInstallPrompt = ref(false)
const isInstalling = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Functions
const installApp = async () => {
  if (!deferredPrompt.value) return
  
  isInstalling.value = true
  
  try {
    // Show the install prompt
    deferredPrompt.value.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.value.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    
    // Clear the saved prompt since it can only be used once
    deferredPrompt.value = null
    showInstallPrompt.value = false
  } catch (error) {
    console.error('Error during app installation:', error)
  } finally {
    isInstalling.value = false
  }
}

const dismissPrompt = () => {
  showInstallPrompt.value = false
  // Save user's choice to not show again for a while
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}

const shouldShowPrompt = () => {
  // Don't show if already installed
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return false
  }
  
  // Don't show if user dismissed recently (24 hours)
  const dismissedTime = localStorage.getItem('pwa-install-dismissed')
  if (dismissedTime) {
    const dayInMs = 24 * 60 * 60 * 1000
    if (Date.now() - parseInt(dismissedTime) < dayInMs) {
      return false
    }
  }
  
  return true
}

// Lifecycle
onMounted(() => {
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault()
    
    // Save the event so it can be triggered later
    deferredPrompt.value = e as BeforeInstallPromptEvent
    
    // Show our custom install prompt if conditions are met
    if (shouldShowPrompt()) {
      showInstallPrompt.value = true
    }
  })
  
  // Listen for successful app installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed')
    showInstallPrompt.value = false
    deferredPrompt.value = null
  })
})
</script>
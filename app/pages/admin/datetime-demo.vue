<!--
  DateTimePicker Demo Page
  
  This page demonstrates the locale-aware DateTimePicker component
  with various configurations and formats.
-->
<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t('dateTime.demo.title', 'DateTime Picker Demo') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        These datetime pickers automatically adapt to your browser's locale and display format.
        Current locale: <strong>{{ currentLocale }}</strong>
      </p>

      <div class="grid gap-8 md:grid-cols-2">
        <!-- Date Picker -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Date Picker</h2>
          
          <UIDateTimePicker 
            v-model="dateValue"
            type="date"
            label="Select a date"
            help-text="Choose any date to see how it formats according to your locale"
            :show-formatted-preview="true"
          />
          
          <div v-if="dateValue" class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <h3 class="font-medium text-gray-900 dark:text-white mb-2">Raw Value (ISO):</h3>
            <code class="text-sm text-gray-600 dark:text-gray-300">{{ dateValue }}</code>
            
            <h3 class="font-medium text-gray-900 dark:text-white mb-2 mt-3">Formatted Displays:</h3>
            <ul class="text-sm space-y-1">
              <li><strong>Short:</strong> {{ formatDate(dateValue) }}</li>
              <li><strong>Long:</strong> {{ formatDate(dateValue, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</li>
              <li><strong>Numeric:</strong> {{ formatDate(dateValue, { year: 'numeric', month: '2-digit', day: '2-digit' }) }}</li>
            </ul>
          </div>
        </div>

        <!-- DateTime Picker -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">DateTime Picker</h2>
          
          <UIDateTimePicker 
            v-model="dateTimeValue"
            type="datetime-local"
            label="Select date and time"
            help-text="Date and time will be displayed in your local timezone"
            :show-formatted-preview="true"
          />
          
          <div v-if="dateTimeValue" class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <h3 class="font-medium text-gray-900 dark:text-white mb-2">Raw Value (ISO):</h3>
            <code class="text-sm text-gray-600 dark:text-gray-300">{{ dateTimeValue }}</code>
            
            <h3 class="font-medium text-gray-900 dark:text-white mb-2 mt-3">Formatted Displays:</h3>
            <ul class="text-sm space-y-1">
              <li><strong>Short:</strong> {{ formatDateTime(dateTimeValue) }}</li>
              <li><strong>Full:</strong> {{ formatDateTime(dateTimeValue, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</li>
              <li><strong>Relative:</strong> {{ formatRelativeTime(dateTimeValue) }}</li>
            </ul>
          </div>
        </div>

        <!-- Time Picker -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Time Picker</h2>
          
          <UIDateTimePicker 
            v-model="timeValue"
            type="time"
            label="Select a time"
            help-text="Time format will match your system preferences (12h/24h)"
            :show-formatted-preview="true"
          />
          
          <div v-if="timeValue" class="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <h3 class="font-medium text-gray-900 dark:text-white mb-2">Raw Value (ISO):</h3>
            <code class="text-sm text-gray-600 dark:text-gray-300">{{ timeValue }}</code>
            
            <h3 class="font-medium text-gray-900 dark:text-white mb-2 mt-3">Formatted Displays:</h3>
            <ul class="text-sm space-y-1">
              <li><strong>Default:</strong> {{ formatTime(timeValue) }}</li>
              <li><strong>12-hour:</strong> {{ formatTime(timeValue, { hour: 'numeric', minute: '2-digit', hour12: true }) }}</li>
              <li><strong>24-hour:</strong> {{ formatTime(timeValue, { hour: '2-digit', minute: '2-digit', hour12: false }) }}</li>
            </ul>
          </div>
        </div>

        <!-- Portfolio ATH Example -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Portfolio ATH Example</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            This shows how it's used in the admin portfolios page:
          </p>
          
          <UIDateTimePicker 
            v-model="athValue"
            type="datetime-local"
            label="ATH Date & Time"
            help-text="Date and time when the ATH was reached"
            :show-formatted-preview="true"
          />
        </div>
      </div>

      <!-- Locale Information -->
      <div class="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 class="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">Locale Information & Testing</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <h3 class="font-medium text-blue-800 dark:text-blue-200 mb-2">Detected Locales:</h3>
            <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li><strong>Browser Locale:</strong> {{ detectedBrowserLocale }}</li>
              <li><strong>i18n Locale:</strong> {{ currentLocale }}</li>
              <li><strong>Navigator Language:</strong> {{ navigatorLanguage }}</li>
              <li><strong>Navigator Languages:</strong> {{ browserLanguages.join(', ') }}</li>
              <li><strong>Timezone:</strong> {{ currentTimezone }}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-medium text-blue-800 dark:text-blue-200 mb-2">Sample Formats (Current Time):</h3>
            <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li><strong>Date (Browser):</strong> {{ sampleDateBrowser }}</li>
              <li><strong>Date (i18n):</strong> {{ sampleDateI18n }}</li>
              <li><strong>DateTime (Browser):</strong> {{ sampleDateTimeBrowser }}</li>
              <li><strong>DateTime (i18n):</strong> {{ sampleDateTimeI18n }}</li>
              <li><strong>Time (Browser):</strong> {{ sampleTimeBrowser }}</li>
              <li><strong>Number:</strong> {{ sampleNumber }}</li>
            </ul>
          </div>
        </div>
        
        <!-- Test various locale scenarios -->
        <div class="mt-4 p-4 bg-white dark:bg-gray-800 rounded border">
          <h3 class="font-medium text-gray-900 dark:text-white mb-2">Format Comparison Test:</h3>
          <div class="text-sm space-y-1">
            <div class="grid grid-cols-3 gap-2 font-medium text-gray-600 dark:text-gray-400">
              <span>Method</span>
              <span>Date Format</span>
              <span>Time Format</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">Browser Default:</span>
              <span>{{ testDate.toLocaleDateString() }}</span>
              <span>{{ testDate.toLocaleTimeString() }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">Norwegian (no-NO):</span>
              <span>{{ testDate.toLocaleDateString('no-NO') }}</span>
              <span>{{ testDate.toLocaleTimeString('no-NO') }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">US English (en-US):</span>
              <span>{{ testDate.toLocaleDateString('en-US') }}</span>
              <span>{{ testDate.toLocaleTimeString('en-US') }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <span class="font-medium">Our useDateTime:</span>
              <span>{{ formatDate(testDate) }}</span>
              <span>{{ formatTime(testDate) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { formatDate, formatDateTime, formatTime, formatRelativeTime, getBrowserLocale } = useDateTime()
const { locale } = useI18n()

// Demo values
const dateValue = ref<string | null>(null)
const dateTimeValue = ref<string | null>(null)
const timeValue = ref<string | null>(null)
const athValue = ref<string | null>(null)

// Locale information
const currentLocale = computed(() => locale.value)
const detectedBrowserLocale = computed(() => getBrowserLocale())
const navigatorLanguage = computed(() => typeof navigator !== 'undefined' ? navigator.language : 'unknown')
const browserLanguages = computed(() => typeof navigator !== 'undefined' ? (navigator.languages || [navigator.language]) : ['unknown'])
const currentTimezone = computed(() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'unknown'
  }
})

// Test date for comparisons
const testDate = new Date()
const now = new Date()

// Sample formats using different approaches
const sampleDateBrowser = computed(() => {
  try {
    return new Intl.DateTimeFormat(getBrowserLocale()).format(now)
  } catch {
    return now.toLocaleDateString()
  }
})

const sampleDateI18n = computed(() => {
  try {
    return new Intl.DateTimeFormat(currentLocale.value).format(now)
  } catch {
    return now.toLocaleDateString()
  }
})

const sampleDateTimeBrowser = computed(() => {
  try {
    return new Intl.DateTimeFormat(getBrowserLocale(), { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    }).format(now)
  } catch {
    return now.toLocaleString()
  }
})

const sampleDateTimeI18n = computed(() => {
  try {
    return new Intl.DateTimeFormat(currentLocale.value, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    }).format(now)
  } catch {
    return now.toLocaleString()
  }
})

const sampleTimeBrowser = computed(() => {
  try {
    return new Intl.DateTimeFormat(getBrowserLocale(), { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }).format(now)
  } catch {
    return now.toLocaleTimeString()
  }
})

const sampleNumber = computed(() => {
  try {
    return new Intl.NumberFormat(getBrowserLocale(), {
      style: 'currency',
      currency: 'NOK'
    }).format(12345.67)
  } catch {
    return '12,345.67 NOK'
  }
})

// SEO
useHead({
  title: 'DateTime Picker Demo',
  meta: [
    { name: 'description', content: 'Demo of locale-aware datetime pickers that adapt to browser settings' }
  ]
})
</script>
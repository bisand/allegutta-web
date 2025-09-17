<!--
  Locale-aware DateTime Picker Component
  
  This component provides a datetime input that automatically adapts to the user's locale
  and system settings while maintaining consistent data formatting for the backend.
-->
<template>
  <div class="relative">
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>

    <div class="relative">
      <!-- Native datetime input with improved styling -->
      <input :id="inputId" ref="dateInput" :type="inputType" :value="nativeInputValue" :required="required" :disabled="disabled" :min="min" :max="max" :step="step"
        :placeholder="placeholderText"
        class="w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white" :class="[
          disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : '',
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
        ]" @input="handleInput" @blur="handleBlur" @focus="handleFocus">
    </div>

    <!-- Display formatted value below input for additional clarity -->
    <div v-if="showFormattedPreview && modelValue" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      <span class="font-medium">{{ $t('dateTime.preview') || 'Preview' }}:</span>
      {{ formattedPreview }}
    </div>

    <!-- Help text with locale-specific format hint -->
    <p v-if="helpText || localeFormatHint" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
      {{ helpText }}
      <span v-if="helpText && localeFormatHint"> • </span>
      <span v-if="localeFormatHint">{{ localeFormatHint }}</span>
    </p>

    <!-- Error message -->
    <p v-if="error" class="mt-1 text-xs text-red-600 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue?: string | Date | null
  label?: string
  required?: boolean
  disabled?: boolean
  type?: 'date' | 'datetime-local' | 'time'
  min?: string
  max?: string
  step?: string
  helpText?: string
  error?: string
  showFormattedPreview?: boolean
  timezone?: string // For datetime inputs
}

interface Emits {
  (e: 'update:modelValue', value: string | null): void
  (e: 'blur' | 'focus'): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  label: undefined,
  type: 'date',
  min: undefined,
  max: undefined,
  step: undefined,
  helpText: undefined,
  error: undefined,
  showFormattedPreview: true,
  timezone: 'Europe/Oslo' // Default to Norwegian timezone
})

const emit = defineEmits<Emits>()

const { formatDate, formatDateTime, formatTime, getBrowserLocale } = useDateTime()

// Focus state management
const isFocused = ref(false)

// Generate unique ID for accessibility
const inputId = computed(() => `datetime-picker-${Math.random().toString(36).substr(2, 9)}`)

// Determine input type
const inputType = computed(() => props.type)

// Get locale-specific placeholder text
const placeholderText = computed(() => {
  const locale = getBrowserLocale()
  const sampleDate = new Date(2025, 8, 17, 14, 30, 0) // September 17, 2025, 14:30

  try {
    switch (props.type) {
      case 'date':
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(sampleDate).replace(/\d/g, 'X')
      case 'datetime-local':
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(sampleDate).replace(/\d/g, 'X')
      case 'time':
        return new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit'
        }).format(sampleDate).replace(/\d/g, 'X')
      default:
        return ''
    }
  } catch {
    // Fallback placeholders
    switch (props.type) {
      case 'date': return 'DD.MM.YYYY'
      case 'datetime-local': return 'DD.MM.YYYY HH:MM'
      case 'time': return 'HH:MM'
      default: return ''
    }
  }
})

// Get locale-specific format hint
const localeFormatHint = computed(() => {
  const locale = getBrowserLocale()
  const isNorwegian = locale.startsWith('no') || locale.startsWith('nb') || locale.startsWith('nn')

  switch (props.type) {
    case 'date':
      return isNorwegian ? 'Format: DD.MM.YYYY' : `Format: ${placeholderText.value}`
    case 'datetime-local':
      return isNorwegian ? 'Format: DD.MM.YYYY HH:MM' : `Format: ${placeholderText.value}`
    case 'time':
      return isNorwegian ? 'Format: HH:MM (24-timer)' : `Format: ${placeholderText.value}`
    default:
      return ''
  }
})

// Convert modelValue to native input format
const nativeInputValue = computed(() => {
  if (!props.modelValue) return ''

  const date = typeof props.modelValue === 'string' ? new Date(props.modelValue) : props.modelValue

  if (isNaN(date.getTime())) return ''

  switch (props.type) {
    case 'date':
      return date.toISOString().split('T')[0] // YYYY-MM-DD
    case 'datetime-local': {
      // Convert to local timezone and format as YYYY-MM-DDTHH:mm
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      return localDate.toISOString().slice(0, 16)
    }
    case 'time':
      return date.toTimeString().slice(0, 5) // HH:mm
    default:
      return ''
  }
})

// Format preview based on locale
const formattedPreview = computed(() => {
  if (!props.modelValue) return ''

  const date = typeof props.modelValue === 'string' ? new Date(props.modelValue) : props.modelValue

  if (isNaN(date.getTime())) return 'Invalid Date'

  switch (props.type) {
    case 'date':
      return formatDate(date, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    case 'datetime-local':
      return formatDateTime(date, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: props.timezone
      })
    case 'time':
      return formatTime(date, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    default:
      return ''
  }
})

// Handle input changes
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  if (!value) {
    emit('update:modelValue', null)
    return
  }

  try {
    let date: Date

    switch (props.type) {
      case 'date':
        // Parse YYYY-MM-DD format
        date = new Date(value + 'T00:00:00.000Z')
        break
      case 'datetime-local':
        // Parse YYYY-MM-DDTHH:mm format and convert to UTC
        date = new Date(value)
        break
      case 'time': {
        // Parse HH:mm format and use today's date
        const today = new Date()
        const [hours, minutes] = value.split(':').map(Number)
        date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
        break
      }
      default:
        date = new Date(value)
    }

    if (isNaN(date.getTime())) {
      emit('update:modelValue', null)
      return
    }

    // Emit ISO string for consistent backend processing
    emit('update:modelValue', date.toISOString())
  } catch (error) {
    console.warn('Date parsing error:', error)
    emit('update:modelValue', null)
  }
}

const handleFocus = () => {
  isFocused.value = true
  emit('focus')
}

const handleBlur = () => {
  isFocused.value = false
  emit('blur')
}

// Expose methods for parent component access
defineExpose({
  focus: () => {
    const input = document.getElementById(inputId.value)
    input?.focus()
  },
  blur: () => {
    const input = document.getElementById(inputId.value)
    input?.blur()
  }
})
</script>

<style scoped>
/* Normalize form input styling across all browsers */
input[type="date"],
input[type="datetime-local"],
input[type="time"] {
  /* Reset browser defaults */
  -webkit-appearance: none;
  -moz-appearance: textfield;
  appearance: none;
  
  /* Ensure consistent font properties */
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  
  /* Consistent sizing */
  height: auto;
  min-height: 2.5rem; /* 40px - matches other inputs */
  
  /* Ensure padding is applied correctly */
  box-sizing: border-box;
}

/* Ensure calendar picker indicators are properly positioned and styled */
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="datetime-local"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  margin: 0;
  padding: 0;
  /* Ensure the icon doesn't affect the input width */
  flex-shrink: 0;
  /* Default dark icon for light backgrounds */
  filter: none;
}

/* Dark mode calendar picker styling - properly scoped to just the icon */
.dark input[type="date"]::-webkit-calendar-picker-indicator,
.dark input[type="datetime-local"]::-webkit-calendar-picker-indicator,
.dark input[type="time"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}

/* Firefox specific fixes */
@-moz-document url-prefix() {
  input[type="date"],
  input[type="datetime-local"],
  input[type="time"] {
    appearance: textfield;
    -moz-appearance: textfield;
  }
}
</style>

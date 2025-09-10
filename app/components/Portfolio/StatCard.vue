<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <slot name="icon" />
      </div>
      <div class="ml-5 w-0 flex-1">
        <dl>
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate flex items-center">
            {{ title }}
            <span v-if="displayTitleIcon" class="ml-1 text-yellow-500">{{ titleIcon }}</span>
            <div v-if="loading" class="inline-block animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent ml-2" />
            <slot name="badge" />
          </dt>
          <dd class="text-lg font-semibold text-gray-900 dark:text-white">
            <slot />
          </dd>
          <dd v-if="$slots.subtitle" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <slot name="subtitle" />
          </dd>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'

const props = withDefaults(defineProps<{
  title: string;
  loading?: boolean;
  titleIcon?: string;
  displayTitleIcon?: boolean;
}>(), {
  loading: false,
  titleIcon: '',
  displayTitleIcon: false
})
const title = toRef(props, 'title')
const loading = toRef(props, 'loading')
const titleIcon = toRef(props, 'titleIcon')
const displayTitleIcon = toRef(props, 'displayTitleIcon')
</script>

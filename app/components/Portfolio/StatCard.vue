<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 min-h-[72px] flex items-center">
    <div class="flex items-center w-full">
      <div class="flex-shrink-0 transform scale-20 sm:scale-100">
        <component :is="iconComponent" v-if="iconComponent" :class="['w-5 h-5 md:w-8 md:h-8', iconClass]" />
        <slot v-else name="icon" />
      </div>
      <div class="ml-4 sm:ml-5 w-0 flex-1">
        <dl>
          <dt class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate flex items-center">
            {{ title }}
            <span v-if="displayTitleIcon" class="ml-1 text-yellow-500">{{ titleIcon }}</span>
            <div v-if="loading" class="inline-block animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border border-blue-400 border-t-transparent ml-2" />
            <slot name="badge" />
          </dt>
          <dd class="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
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
import { toRef, type Component } from 'vue'

const props = withDefaults(defineProps<{
  title: string;
  loading?: boolean;
  titleIcon?: string;
  displayTitleIcon?: boolean;
  // allow passing an icon component (eg. imported Heroicon)
  iconComponent?: Component | null;
  // css classes to apply to the icon component
  iconClass?: string | string[];
}>(), {
  loading: false,
  titleIcon: '',
  displayTitleIcon: false,
  iconComponent: null,
  iconClass: ''
})
const title = toRef(props, 'title')
const loading = toRef(props, 'loading')
const titleIcon = toRef(props, 'titleIcon')
const displayTitleIcon = toRef(props, 'displayTitleIcon')
const iconComponent = toRef(props, 'iconComponent')
const iconClass = toRef(props, 'iconClass')
</script>

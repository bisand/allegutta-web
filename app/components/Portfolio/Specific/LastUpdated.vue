<template>
  <PortfolioStatCard :title="$t('portfolioPage.lastUpdated')" :loading="loading" :icon-component="ClockIcon" :icon-class="['text-purple-500']">
    <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ text }}</div>
    <template #subtitle>
      {{ relative }}
    </template>
  </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { ClockIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  loading?: boolean
  text?: string | null
  relative?: string | null
}>()

const loading = computed(() => !!props.loading)
const text = computed(() => props.text ?? '')
const relative = computed(() => props.relative ?? '')
</script>

<style scoped></style>
<template>
  <PortfolioStatCard :title="$t('portfolioPage.marketValue')" :loading="loading" :icon-component="ChartBarIcon" :icon-class="['text-blue-500']">
    {{ valueText }}
  </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { ChartBarIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  valueText?: string | null
  loading?: boolean
}>()

const valueText = computed(() => props.valueText ?? '')
const loading = computed(() => !!props.loading)
</script>

<style scoped></style>

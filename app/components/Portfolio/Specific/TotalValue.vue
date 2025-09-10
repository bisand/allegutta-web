<template>
  <PortfolioStatCard :title="$t('portfolioPage.totalValue')" :loading="loading" :icon-component="CurrencyDollarIcon" :icon-class="['text-green-600']">
    {{ valueText }}
  </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { CurrencyDollarIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  valueText?: string | null
  loading?: boolean
}>()

const valueText = computed(() => props.valueText ?? '')
const loading = computed(() => !!props.loading)
</script>

<style scoped></style>

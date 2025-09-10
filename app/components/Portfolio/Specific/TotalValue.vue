<template>
  <PortfolioStatCard :title="$t('portfolioPage.totalValue')" :loading="loading">
    <template #icon>
      <CurrencyDollarIcon class="w-8 h-8 text-green-600" />
    </template>
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

<template>
  <PortfolioStatCard :title="$t('portfolioPage.holdings')" :loading="loading">
    <template #icon>
      <ClockIcon class="w-8 h-8 text-purple-500" />
    </template>
    {{ count }} {{ $t('portfolioPage.positions') }}
  </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { ClockIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  count?: number | null
  loading?: boolean
}>()

const count = computed(() => props.count ?? 0)
const loading = computed(() => !!props.loading)
</script>

<style scoped></style>

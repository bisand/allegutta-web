<template>
  <PortfolioStatCard :title="$t('portfolioPage.holdings')" :loading="loading" :icon-component="Squares2X2Icon" :icon-class="['text-blue-500']">
    {{ count }} {{ $t('portfolioPage.positions') }}
  </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { Squares2X2Icon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  count?: number | null
  loading?: boolean
}>()

const count = computed(() => props.count ?? 0)
const loading = computed(() => !!props.loading)
</script>

<style scoped></style>

<template>
  <PortfolioStatCard :title="$t('portfolioPage.changedToday')">
    <template #icon>
      <ArrowTrendingUpIcon class="w-8 h-8" :class="iconClass" />
    </template>
    <div class="text-lg font-semibold" :class="valueClass">{{ currencyText }}</div>
    <template #subtitle>
      <span :class="subtitleClass">{{ percentageText }}</span>
    </template>
  </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { ArrowTrendingUpIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  currencyText?: string | null
  percentageText?: string | null
  isPositive?: boolean
  isNegative?: boolean
}>()

const currencyText = computed(() => props.currencyText ?? '')
const percentageText = computed(() => props.percentageText ?? '')
const isPositive = computed(() => !!props.isPositive)
const isNegative = computed(() => !!props.isNegative)

const iconClass = computed(() => isPositive.value ? 'text-green-500' : isNegative.value ? 'text-red-500' : 'text-gray-500')
const valueClass = computed(() => isPositive.value ? 'text-green-600' : isNegative.value ? 'text-red-600' : 'text-gray-900 dark:text-white')
const subtitleClass = computed(() => isPositive.value ? 'text-green-600' : isNegative.value ? 'text-red-600' : 'text-gray-600')
</script>

<style scoped></style>

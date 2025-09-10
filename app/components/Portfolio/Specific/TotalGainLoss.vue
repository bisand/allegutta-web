<template>
  <PortfolioStatCard :title="$t('portfolioPage.totalGainLoss')">
    <template #icon>
      <ArrowTrendingUpIcon class="w-8 h-8" :class="iconClass" />
    </template>
    <span :class="valueClass">{{ sign }}{{ amountText }} ({{ percentageText }}%)</span>
  </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  amountText?: string | null
  percentageText?: string | null
  isPositive?: boolean
}>()

const amountText = computed(() => props.amountText ?? '')
const percentageText = computed(() => props.percentageText ?? '')
const isPositive = computed(() => !!props.isPositive)

const iconClass = computed(() => isPositive.value ? 'text-green-500' : 'text-red-500')
const valueClass = computed(() => isPositive.value ? 'text-green-600' : 'text-red-600')
const sign = computed(() => isPositive.value ? '+' : '')
</script>

<style scoped></style>

<template>
    <PortfolioStatCard :title="$t('portfolioPage.allTimeHigh')" title-icon="⭐" :display-title-icon="isAtAth">
        <template #icon>
            <ChartBarIcon class="w-8 h-8" :class="iconClass" />
        </template>
        <div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ valueText }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ dateText }}</div>
        </div>
    </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { ChartBarIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
    valueText?: string | null
    dateText?: string | null
    isAtAth?: boolean
}>()

const valueText = computed(() => props.valueText ?? '')
const dateText = computed(() => props.dateText ?? '')
const isAtAth = computed(() => !!props.isAtAth)

const iconClass = computed(() => isAtAth.value ? 'text-yellow-500' : 'text-blue-500')
</script>

<style scoped></style>

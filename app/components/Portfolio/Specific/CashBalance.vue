<template>
    <PortfolioStatCard :title="$t('portfolioPage.cashBalance')" :loading="loading">
        <template #icon>
            <BanknotesIcon class="w-8 h-8 text-green-500" />
        </template>
        {{ valueText }}
    </PortfolioStatCard>
</template>

<script lang="ts" setup>
import { BanknotesIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
    valueText?: string | null
    loading?: boolean
}>()

const valueText = computed(() => props.valueText ?? '')
const loading = computed(() => !!props.loading)
</script>

<style scoped></style>

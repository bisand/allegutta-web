<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('portfolioPage.holdingsTable') }}</h3>
      <div v-if="loadingHoldings" class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
    </div>
    <div class="overflow-x-auto">
      <table v-if="sortedHoldings && sortedHoldings.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
              <button class="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('symbol')">
                <span>{{ $t('portfolioPage.symbol') }}</span>
                <component :is="getSortIcon?.('symbol')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
            <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
              <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort?.('quantity')">
                <span>{{ $t('portfolioPage.quantity') }}</span>
                <component :is="getSortIcon?.('quantity')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
            <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
              <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort?.('avgPrice')">
                <span>{{ $t('portfolioPage.avgPrice') }}</span>
                <component :is="getSortIcon?.('avgPrice')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
            <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
              <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort?.('cost')">
                <span>{{ $t('portfolioPage.cost') }}</span>
                <component :is="getSortIcon?.('cost')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
            <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
              <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto"
                @click="handleSort?.('currentPrice')">
                <span>{{ $t('portfolioPage.currentPrice') }}</span>
                <component :is="getSortIcon?.('currentPrice')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
            <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
              <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto"
                @click="handleSort?.('todayChange')">
                <span>{{ $t('portfolioPage.todayChange') }}</span>
                <component :is="getSortIcon?.('todayChange')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
            <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
              <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto"
                @click="handleSort?.('marketValue')">
                <span>{{ $t('portfolioPage.marketValue') }}</span>
                <component :is="getSortIcon?.('marketValue')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
              <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort?.('gainLoss')">
                <span>{{ $t('portfolioPage.gainLoss') }}</span>
                <component :is="getSortIcon?.('gainLoss')" v-if="getSortIcon" class="w-4 h-4" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="holding in sortedHoldings" :key="holding.id">
            <td class="px-4 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ holding.symbol }}
              </div>
              <div v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {{ holding.instrumentName }}
              </div>
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatNumber?.(holding.quantity ?? 0, 0) ?? (holding.quantity ?? 0) }}
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.(holding.avgPrice ?? 0, { decimals: 2 }) ?? (holding.avgPrice ?? 0) }}
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.((holding.quantity ?? 0) * (holding.avgPrice ?? 0), { decimals: 0 }) ?? ((holding.quantity ?? 0) * (holding.avgPrice ?? 0)) }}
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.((holding.currentPrice ?? holding.avgPrice ?? 0), { decimals: 2 }) ?? (holding.currentPrice ?? holding.avgPrice ?? 0) }}
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-right">
              <span v-if="holding.regularMarketChangePercent !== null && holding.regularMarketChangePercent !== undefined"
                :class="holding.regularMarketChangePercent >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatPercentage?.(holding.regularMarketChangePercent ?? 0, 2) ?? (holding.regularMarketChangePercent ?? 0, 2) }}
              </span>
              <span v-else class="text-gray-400">N/A</span>
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.((holding.quantity ?? 0) * (holding.currentPrice ?? holding.avgPrice ?? 0), { decimals: 0 }) ?? ((holding.quantity ?? 0) * (holding.currentPrice ?? holding.avgPrice ?? 0)) }}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-right">
              <span :class="getGainLossColor?.(holding) ?? ''">
                {{ (getHoldingGainLoss?.(holding) ?? 0) >= 0 ? '+' : '-' }}{{ formatCurrency?.(Math.abs(getHoldingGainLoss?.(holding) ?? 0), { decimals: 0 }) ?? Math.abs(getHoldingGainLoss?.(holding) ?? 0) }}
                ({{ (getHoldingGainLoss?.(holding) ?? 0) >= 0 ? '+' : '-' }}{{ Math.abs(getHoldingGainLossPercentage?.(holding) ?? 0).toFixed(2) }} %)
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="px-6 py-8 text-center">
        <ChartBarIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noHoldingsFound') }}</p>
        <p v-if="canEdit" class="text-sm text-gray-400 dark:text-gray-500 mt-2">
          {{ $t('portfolioPage.startByAdding') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChartBarIcon } from '@heroicons/vue/24/outline'
import { defineProps } from 'vue'

// Sort options for different columns
export type SortKey = 'symbol' | 'instrumentName' | 'quantity' | 'avgPrice' | 'cost' | 'currentPrice' | 'todayChange' | 'marketValue' | 'gainLoss' | 'gainLossPercent'

// prefix with underscore to avoid 'assigned but never used' lint if TS rules complain
const _props = defineProps<{
  sortedHoldings: Holding[]
  loadingHoldings?: boolean
  formatNumber?: (value: number, decimalPlaces: number) => string
  formatCurrency?: (value: number, options?: { currency?: string, decimals?: number }) => string
  formatPercentage?: (value: number | null | undefined, decimalPlaces: number) => string
  getSortIcon?: (column: SortKey) => unknown
  handleSort?: (column: SortKey) => void
  canEdit?: boolean
  getGainLossColor?: (holding: Holding) => string
  getHoldingGainLoss?: (holding: Holding) => number
  getHoldingGainLossPercentage?: (holding: Holding) => number
}>()
</script>

<style scoped>
/* keep styles minimal - component uses Tailwind classes */
</style>

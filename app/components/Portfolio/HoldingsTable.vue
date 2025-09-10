<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('portfolioPage.holdingsTable') }}</h3>
      <div v-if="loadingHoldings" class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
    </div>
    
    <div v-if="sortedHoldings && sortedHoldings.length > 0">
      <!-- Desktop: Table Header (hidden on mobile) -->
      <div class="hidden md:grid md:grid-cols-7 lg:grid-cols-8 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-900 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <button class="text-left hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('symbol')">
          <span class="flex items-center space-x-1">
            <span>{{ $t('portfolioPage.symbol') }}</span>
            <component :is="getSortIcon?.('symbol')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
        <button class="text-right hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('quantity')">
          <span class="flex items-center justify-end space-x-1">
            <span>{{ $t('portfolioPage.quantity') }}</span>
            <component :is="getSortIcon?.('quantity')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
        <button class="text-right hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('avgPrice')">
          <span class="flex items-center justify-end space-x-1">
            <span>{{ $t('portfolioPage.avgPrice') }}</span>
            <component :is="getSortIcon?.('avgPrice')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
        <button class="hidden lg:block text-right hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('cost')">
          <span class="flex items-center justify-end space-x-1">
            <span>{{ $t('portfolioPage.cost') }}</span>
            <component :is="getSortIcon?.('cost')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
        <button class="text-right hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('currentPrice')">
          <span class="flex items-center justify-end space-x-1">
            <span>{{ $t('portfolioPage.currentPrice') }}</span>
            <component :is="getSortIcon?.('currentPrice')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
        <button class="text-right hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('todayChange')">
          <span class="flex items-center justify-end space-x-1">
            <span>{{ $t('portfolioPage.todayChange') }}</span>
            <component :is="getSortIcon?.('todayChange')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
        <button class="text-right hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('marketValue')">
          <span class="flex items-center justify-end space-x-1">
            <span>{{ $t('portfolioPage.marketValue') }}</span>
            <component :is="getSortIcon?.('marketValue')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
        <button class="text-right hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort?.('gainLoss')">
          <span class="flex items-center justify-end space-x-1">
            <span>{{ $t('portfolioPage.gainLoss') }}</span>
            <component :is="getSortIcon?.('gainLoss')" v-if="getSortIcon" class="w-4 h-4" />
          </span>
        </button>
      </div>

      <!-- Holdings List -->
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        <div v-for="holding in sortedHoldings" :key="holding.id" class="p-4 md:p-6">
          <!-- Mobile: Compact Table-like Layout -->
          <div class="md:hidden">
            <!-- Symbol/Name and Market Value -->
            <div class="mb-3 flex justify-between items-start">
              <div class="flex-1">
                <div class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ holding.symbol }}
                </div>
                <div v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {{ holding.instrumentName }}
                </div>
              </div>
              <div class="text-right ml-4">
                <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.marketValue') }}</div>
                <div class="text-base font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency?.((holding.quantity ?? 0) * (holding.currentPrice ?? holding.avgPrice ?? 0), { decimals: 0 }) ?? ((holding.quantity ?? 0) * (holding.currentPrice ?? holding.avgPrice ?? 0)) }}
                </div>
              </div>
            </div>
            
            <!-- All data in compact 3-column grid layout -->
            <div class="grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
              <!-- Row 1: Antall, Pris, Kostnad -->
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.quantity') }}</div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatNumber?.(holding.quantity ?? 0, 0) ?? (holding.quantity ?? 0) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.currentPrice') }}</div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency?.((holding.currentPrice ?? holding.avgPrice ?? 0), { decimals: 2 }) ?? (holding.currentPrice ?? holding.avgPrice ?? 0) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.cost') }}</div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency?.((holding.quantity ?? 0) * (holding.avgPrice ?? 0), { decimals: 0 }) ?? ((holding.quantity ?? 0) * (holding.avgPrice ?? 0)) }}
                </div>
              </div>

              <!-- Row 2: GAV, I dag %, Gevinst/Tap -->
              <div>
                <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.avgPrice') }}</div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency?.(holding.avgPrice ?? 0, { decimals: 2 }) ?? (holding.avgPrice ?? 0) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.todayChange') }}</div>
                <div class="font-medium">
                  <span v-if="holding.regularMarketChangePercent !== null && holding.regularMarketChangePercent !== undefined"
                    :class="holding.regularMarketChangePercent >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatPercentage?.(holding.regularMarketChangePercent ?? 0, 2) ?? (holding.regularMarketChangePercent ?? 0, 2) }}
                  </span>
                  <span v-else class="text-gray-400">N/A</span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.gainLoss') }}</div>
                <div class="font-semibold">
                  <span :class="getGainLossColor?.(holding) ?? ''">
                    {{ (getHoldingGainLoss?.(holding) ?? 0) >= 0 ? '+' : '-' }}{{ formatCurrency?.(Math.abs(getHoldingGainLoss?.(holding) ?? 0), { decimals: 0 }) ?? Math.abs(getHoldingGainLoss?.(holding) ?? 0) }}
                    <div class="text-xs">
                      ({{ (getHoldingGainLoss?.(holding) ?? 0) >= 0 ? '+' : '-' }}{{ Math.abs(getHoldingGainLossPercentage?.(holding) ?? 0).toFixed(2) }}%)
                    </div>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Grid Layout -->
          <div class="hidden md:grid md:grid-cols-7 lg:grid-cols-8 gap-4 items-center">
            <!-- Symbol & Name -->
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ holding.symbol }}
              </div>
              <div v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {{ holding.instrumentName }}
              </div>
            </div>
            
            <!-- Quantity -->
            <div class="text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatNumber?.(holding.quantity ?? 0, 0) ?? (holding.quantity ?? 0) }}
            </div>
            
            <!-- Avg Price -->
            <div class="text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.(holding.avgPrice ?? 0, { decimals: 2 }) ?? (holding.avgPrice ?? 0) }}
            </div>
            
            <!-- Cost (Desktop only) -->
            <div class="hidden lg:block text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.((holding.quantity ?? 0) * (holding.avgPrice ?? 0), { decimals: 0 }) ?? ((holding.quantity ?? 0) * (holding.avgPrice ?? 0)) }}
            </div>
            
            <!-- Current Price -->
            <div class="text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.((holding.currentPrice ?? holding.avgPrice ?? 0), { decimals: 2 }) ?? (holding.currentPrice ?? holding.avgPrice ?? 0) }}
            </div>
            
            <!-- Today Change -->
            <div class="text-sm text-right">
              <span v-if="holding.regularMarketChangePercent !== null && holding.regularMarketChangePercent !== undefined"
                :class="holding.regularMarketChangePercent >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ formatPercentage?.(holding.regularMarketChangePercent ?? 0, 2) ?? (holding.regularMarketChangePercent ?? 0, 2) }}
              </span>
              <span v-else class="text-gray-400">N/A</span>
            </div>
            
            <!-- Market Value -->
            <div class="text-sm text-gray-500 dark:text-gray-400 text-right">
              {{ formatCurrency?.((holding.quantity ?? 0) * (holding.currentPrice ?? holding.avgPrice ?? 0), { decimals: 0 }) ?? ((holding.quantity ?? 0) * (holding.currentPrice ?? holding.avgPrice ?? 0)) }}
            </div>
            
            <!-- Gain/Loss -->
            <div class="text-sm text-right">
              <span :class="getGainLossColor?.(holding) ?? ''">
                <div class="font-medium">
                  {{ (getHoldingGainLoss?.(holding) ?? 0) >= 0 ? '+' : '-' }}{{ formatCurrency?.(Math.abs(getHoldingGainLoss?.(holding) ?? 0), { decimals: 0 }) ?? Math.abs(getHoldingGainLoss?.(holding) ?? 0) }}
                </div>
                <div class="text-xs">
                  ({{ (getHoldingGainLoss?.(holding) ?? 0) >= 0 ? '+' : '-' }}{{ Math.abs(getHoldingGainLossPercentage?.(holding) ?? 0).toFixed(2) }}%)
                </div>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="px-6 py-8 text-center">
      <ChartBarIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noHoldingsFound') }}</p>
      <p v-if="canEdit" class="text-sm text-gray-400 dark:text-gray-500 mt-2">
        {{ $t('portfolioPage.startByAdding') }}
      </p>
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

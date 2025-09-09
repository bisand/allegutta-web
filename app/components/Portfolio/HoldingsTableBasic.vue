<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Symbol
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            ISIN
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Quantity
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Avg Price
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Current Price
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Market Value
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Gain/Loss
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            %
          </th>
        </tr>
      </thead>
      <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
        <tr v-if="holdings.length === 0">
          <td colspan="8" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <UIcon name="i-heroicons-chart-bar" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p class="text-lg font-medium">No holdings found</p>
            <p class="text-sm">Add some transactions to see your holdings here</p>
          </td>
        </tr>
        <tr 
          v-for="holding in holdings" 
          :key="holding.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="font-medium text-gray-900 dark:text-white">
              {{ displaySymbol(holding.symbol) }}
            </div>
            <div v-if="isCashHolding(holding.symbol)" class="text-xs text-gray-500 dark:text-gray-400">
              {{ getCurrency(holding.symbol) }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div v-if="holding.isin && !isCashHolding(holding.symbol)" class="text-sm font-mono text-gray-900 dark:text-white">
              {{ holding.isin }}
            </div>
            <div v-else class="text-sm text-gray-400 dark:text-gray-500">
              {{ isCashHolding(holding.symbol) ? 'N/A' : '-' }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            {{ isCashHolding(holding.symbol) ? formatCurrency(holding.quantity) : formatQuantity(holding.quantity) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            <div class="flex items-center">
              <span>{{ isCashHolding(holding.symbol) ? '-' : '$' + formatCurrency(holding.avgPrice) }}</span>
              <button
                v-if="!isCashHolding(holding.symbol) && holding.useManualAvgPrice"
                class="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full"
                title="Using manual GAV"
              >
                Manual
              </button>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            {{ isCashHolding(holding.symbol) ? '-' : '$' + formatCurrency(holding.currentPrice || holding.avgPrice) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            {{ formatCurrency(marketValue(holding)) }}{{ isCashHolding(holding.symbol) ? ' ' + getCurrency(holding.symbol) : '' }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap" :class="gainLossColor(holding)">
            {{ isCashHolding(holding.symbol) ? '-' : '$' + formatCurrency(Math.abs(gainLoss(holding))) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap" :class="gainLossColor(holding)">
            {{ isCashHolding(holding.symbol) ? '-' : formatPercentage(gainLossPercentage(holding)) + '%' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
interface Holding {
  id: string
  symbol: string
  isin?: string | null
  quantity: number
  avgPrice: number
  currentPrice?: number
  useManualAvgPrice?: boolean
  manualAvgPrice?: number | null
  manualAvgPriceReason?: string | null
  manualAvgPriceDate?: string | null
}

defineProps({
  holdings: {
    type: Array as () => Holding[],
    default: () => []
  }
})

function isCashHolding(symbol: string): boolean {
  return symbol.startsWith('CASH_')
}

function displaySymbol(symbol: string): string {
  if (isCashHolding(symbol)) {
    return 'Cash'
  }
  return symbol
}

function getCurrency(symbol: string): string {
  if (isCashHolding(symbol)) {
    return symbol.replace('CASH_', '')
  }
  return ''
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(value)
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function marketValue(holding: Holding): number {
  if (isCashHolding(holding.symbol)) {
    return holding.quantity // For cash, quantity is the value
  }
  return holding.quantity * (holding.currentPrice || holding.avgPrice)
}

function gainLoss(holding: Holding): number {
  if (isCashHolding(holding.symbol)) {
    return 0 // Cash has no gain/loss
  }
  const current = holding.quantity * (holding.currentPrice || holding.avgPrice)
  const cost = holding.quantity * holding.avgPrice
  return current - cost
}

function gainLossPercentage(holding: Holding): number {
  if (isCashHolding(holding.symbol)) {
    return 0 // Cash has no gain/loss percentage
  }
  const gl = gainLoss(holding)
  const cost = holding.quantity * holding.avgPrice
  if (cost === 0) return 0
  return (gl / cost) * 100
}

function gainLossColor(holding: Holding) {
  if (isCashHolding(holding.symbol)) {
    return 'text-gray-600 dark:text-gray-400'
  }
  const gl = gainLoss(holding)
  return {
    'text-green-600 dark:text-green-400': gl >= 0,
    'text-red-600 dark:text-red-400': gl < 0
  }
}
</script>

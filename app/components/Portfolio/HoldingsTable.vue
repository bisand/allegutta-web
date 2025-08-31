<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Symbol
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
          <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
              {{ holding.symbol }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            {{ formatQuantity(holding.quantity) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            ${{ formatCurrency(holding.avgPrice) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            ${{ formatCurrency(holding.currentPrice || holding.avgPrice) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            ${{ formatCurrency(marketValue(holding)) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap" :class="gainLossColor(holding)">
            ${{ formatCurrency(Math.abs(gainLoss(holding))) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap" :class="gainLossColor(holding)">
            {{ formatPercentage(gainLossPercentage(holding)) }}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({
  holdings: {
    type: Array,
    default: () => []
  }
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatQuantity(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(value)
}

function formatPercentage(value) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function marketValue(holding) {
  return holding.quantity * (holding.currentPrice || holding.avgPrice)
}

function gainLoss(holding) {
  const current = holding.quantity * (holding.currentPrice || holding.avgPrice)
  const cost = holding.quantity * holding.avgPrice
  return current - cost
}

function gainLossPercentage(holding) {
  const gl = gainLoss(holding)
  const cost = holding.quantity * holding.avgPrice
  if (cost === 0) return 0
  return (gl / cost) * 100
}

function gainLossColor(holding) {
  const gl = gainLoss(holding)
  return {
    'text-green-600 dark:text-green-400': gl >= 0,
    'text-red-600 dark:text-red-400': gl < 0
  }
}
</script>

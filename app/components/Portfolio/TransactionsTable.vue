<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead class="bg-gray-50 dark:bg-gray-800">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Date
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Symbol
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Type
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Quantity
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Price
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total
          </th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
        <tr v-if="transactions.length === 0">
          <td colspan="7" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            <UIcon name="i-heroicons-banknotes" class="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p class="text-lg font-medium">No transactions found</p>
            <p class="text-sm">Add your first transaction to get started</p>
          </td>
        </tr>
        <tr 
          v-for="transaction in transactions" 
          :key="transaction.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
            {{ formatDate(transaction.date) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="font-medium text-gray-900 dark:text-white">
              {{ transaction.symbol }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <UBadge 
              :color="getTypeColor(transaction.type)" 
              variant="soft"
            >
              {{ transaction.type }}
            </UBadge>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            {{ formatQuantity(transaction.quantity) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            ${{ formatCurrency(transaction.price) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white">
            ${{ formatCurrency(transaction.quantity * transaction.price) }}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <div class="flex items-center space-x-2">
              <UButton 
                variant="ghost" 
                size="sm"
                @click="$emit('edit', transaction)"
              >
                <UIcon name="i-heroicons-pencil" class="w-4 h-4" />
              </UButton>
              <UButton 
                variant="ghost" 
                size="sm" 
                color="red"
                @click="$emit('delete', transaction)"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
              </UButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps({
  transactions: {
    type: Array,
    default: () => []
  }
})

defineEmits(['edit', 'delete'])

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

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

function getTypeColor(type) {
  switch (type) {
    case 'BUY':
      return 'green'
    case 'SELL':
      return 'red'
    case 'DIVIDEND':
      return 'blue'
    case 'SPLIT':
      return 'yellow'
    case 'MERGER':
      return 'purple'
    default:
      return 'gray'
  }
}
</script>

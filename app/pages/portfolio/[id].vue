<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- Loading state - only show during initial load, not during portfolio switches -->
    <div v-if="portfolioStore.initializing || (portfolioStore.loading && !currentPortfolio)" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.loading') }}</p>
      </div>
    </div>

    <!-- Portfolio not found -->
    <div v-else-if="!currentPortfolio" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <ChartBarIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ $t('portfolioPage.notFound') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          {{ $t('portfolioPage.noAccess') }}
        </p>
        <NuxtLink to="/" class="text-primary-500 hover:text-primary-600">
          {{ $t('common.backToHome') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Portfolio content -->
    <Transition enter-active-class="transition-opacity duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="currentPortfolio" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {{ currentPortfolio.name }}
                <span v-if="currentPortfolio.isDefault" class="text-sm text-primary-500 ml-2">({{ $t('portfolioPage.default') }})</span>
              </h1>
              <p v-if="currentPortfolio.description" class="text-gray-600 dark:text-gray-400 mb-2">
                {{ currentPortfolio.description }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-500">
                {{ $t('portfolioPage.portfolioId') }}: {{ currentPortfolio.id }}
              </p>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
              <!-- Admin Edit Button - only for admins -->
              <NuxtLink v-if="isAdmin" :to="`/admin/portfolios?edit=${currentPortfolio.id}`"
                class="flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors">
                <PencilSquareIcon class="w-4 h-4 mr-2" />
                {{ $t('portfolioPage.adminEdit') }}
              </NuxtLink>

              <button v-if="canEdit" type="button"
                class="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                :disabled="portfolioStore.loading" @click="refreshPrices">
                <ArrowPathIcon class="w-4 h-4 mr-2" />
                {{ $t('portfolioPage.updatePrices') }}
              </button>

              <button type="button"
                class="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                :disabled="refreshingEnhanced" :title="$t('portfolioPage.refreshData')" @click="refreshEnhancedData">
                <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': refreshingEnhanced }" />
              </button>
            </div>
          </div>
        </div>

        <!-- Portfolio Statistics -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard :title="$t('portfolioPage.marketValue')" :loading="refreshingEnhanced">
            <template #icon>
              <ChartBarIcon class="w-8 h-8 text-blue-500" />
            </template>
            {{ formatCurrency(portfolioStore.marketValue, { decimals: 0 }) }}
          </StatCard>

          <StatCard :title="$t('portfolioPage.cashBalance')" :loading="portfolioStore.loadingHoldings">
            <template #icon>
              <BanknotesIcon class="w-8 h-8 text-green-500" />
            </template>
            {{ formatCurrency(currentPortfolio?.cashBalance || 0, { decimals: 0 }) }}
          </StatCard>

          <StatCard :title="$t('portfolioPage.totalValue')" :loading="refreshingEnhanced">
            <template #icon>
              <CurrencyDollarIcon class="w-8 h-8 text-green-600" />
            </template>
            {{ formatCurrency(portfolioStore.totalValue, { decimals: 0 }) }}
          </StatCard>

          <StatCard :title="$t('portfolioPage.totalGainLoss')">
            <template #icon>
              <ArrowTrendingUpIcon class="w-8 h-8" :class="portfolioStore.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'" />
            </template>
            <span :class="portfolioStore.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ portfolioStore.totalGainLoss >= 0 ? '+' : '' }}{{ formatCurrency(Math.abs(portfolioStore.totalGainLoss), { decimals: 0 }) }}
              ({{ formatPercentage(portfolioStore.totalGainLossPercentage) }}%)
            </span>
          </StatCard>

          <!-- All-Time High (ATH) -->
          <StatCard :title="$t('portfolioPage.allTimeHigh')">
            <template #icon>
              <ChartBarIcon class="w-8 h-8" :class="athData.isAtAth ? 'text-yellow-500' : 'text-blue-500'" />
            </template>
            <div>
              <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ athData.value }}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ athData.dateText }}</div>
            </div>
          </StatCard>

          <StatCard class="lg:hidden" :title="$t('portfolioPage.lastUpdated')" :loading="refreshingEnhanced">
            <template #icon>
              <ClockIcon class="w-8 h-8 text-purple-500" />
            </template>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ formatDateTime(marketDataLastUpdated || currentPortfolio.updatedAt) }}</div>
            <template #subtitle>
              {{ dynamicRelativeTime }}
            </template>
          </StatCard>

          <StatCard class="lg:hidden" :title="$t('portfolioPage.changedToday')">
            <template #icon>
              <ArrowTrendingUpIcon class="w-8 h-8" :class="dailyChangeData.isPositive ? 'text-green-500' : dailyChangeData.isNegative ? 'text-red-500' : 'text-gray-500'" />
            </template>
            <div class="text-lg font-semibold"
              :class="dailyChangeData.isPositive ? 'text-green-600' : dailyChangeData.isNegative ? 'text-red-600' : 'text-gray-900 dark:text-white'">{{
                dailyChangeData.currencyValue }}</div>
            <template #subtitle>
              <span :class="dailyChangeData.isPositive ? 'text-green-600' : dailyChangeData.isNegative ? 'text-red-600' : 'text-gray-600'">{{ dailyChangeData.percentageValue
              }}</span>
            </template>
          </StatCard>

          <StatCard class="lg:hidden" :title="$t('portfolioPage.holdings')" :loading="portfolioStore.loadingHoldings">
            <template #icon>
              <ClockIcon class="w-8 h-8 text-purple-500" />
            </template>
            {{ portfolioStore.portfolioHoldings.length }} {{ $t('portfolioPage.positions') }}
          </StatCard>

        </div>

        <!-- Enhanced Portfolio Metrics -->
        <div class="hidden lg:grid lg:grid-cols-3 gap-6 mb-8">
          <StatCard :title="$t('portfolioPage.lastUpdated')" :loading="refreshingEnhanced">
            <template #icon>
              <ClockIcon class="w-8 h-8 text-purple-500" />
            </template>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">{{ formatDateTime(marketDataLastUpdated || currentPortfolio.updatedAt) }}</div>
            <template #subtitle>
              {{ dynamicRelativeTime }}
            </template>
          </StatCard>

          <StatCard :title="$t('portfolioPage.changedToday')">
            <template #icon>
              <ArrowTrendingUpIcon class="w-8 h-8" :class="dailyChangeData.isPositive ? 'text-green-500' : dailyChangeData.isNegative ? 'text-red-500' : 'text-gray-500'" />
            </template>
            <div class="text-lg font-semibold"
              :class="dailyChangeData.isPositive ? 'text-green-600' : dailyChangeData.isNegative ? 'text-red-600' : 'text-gray-900 dark:text-white'">{{
                dailyChangeData.currencyValue }}</div>
            <template #subtitle>
              <span :class="dailyChangeData.isPositive ? 'text-green-600' : dailyChangeData.isNegative ? 'text-red-600' : 'text-gray-600'">{{ dailyChangeData.percentageValue
              }}</span>
            </template>
          </StatCard>

          <StatCard :title="$t('portfolioPage.holdings')" :loading="portfolioStore.loadingHoldings">
            <template #icon>
              <ClockIcon class="w-8 h-8 text-purple-500" />
            </template>
            {{ portfolioStore.portfolioHoldings.length }} {{ $t('portfolioPage.positions') }}
          </StatCard>
        </div>

        <!-- Quick Insights -->
        <InsightsBox v-if="portfolioStore.portfolioHoldings.length > 0" :title="$t('portfolioPage.portfolioInsights')" variant="gradient">
          <div class="text-center">
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ getTopPerformerSymbol() }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.bestPerformer') }}</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ getLargestHoldingSymbol() }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.largestPosition') }}</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ portfolioStore.portfolioTransactions.length }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('portfolioPage.totalTransactions') }}</p>
          </div>
        </InsightsBox>

        <!-- Holdings Table -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('portfolioPage.holdingsTable') }}</h3>
            <div v-if="portfolioStore.loadingHoldings" class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
          </div>
          <div class="overflow-x-auto">
            <table v-if="portfolioStore.portfolioHoldings.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                    <button class="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none" @click="handleSort('symbol')">
                      <span>{{ $t('portfolioPage.symbol') }}</span>
                      <component :is="getSortIcon('symbol')" v-if="getSortIcon('symbol')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                    <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort('quantity')">
                      <span>{{ $t('portfolioPage.quantity') }}</span>
                      <component :is="getSortIcon('quantity')" v-if="getSortIcon('quantity')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                    <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort('avgPrice')">
                      <span>{{ $t('portfolioPage.avgPrice') }}</span>
                      <component :is="getSortIcon('avgPrice')" v-if="getSortIcon('avgPrice')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                    <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort('cost')">
                      <span>{{ $t('portfolioPage.cost') }}</span>
                      <component :is="getSortIcon('cost')" v-if="getSortIcon('cost')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                    <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto"
                      @click="handleSort('currentPrice')">
                      <span>{{ $t('portfolioPage.currentPrice') }}</span>
                      <component :is="getSortIcon('currentPrice')" v-if="getSortIcon('currentPrice')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                    <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto"
                      @click="handleSort('todayChange')">
                      <span>{{ $t('portfolioPage.todayChange') }}</span>
                      <component :is="getSortIcon('todayChange')" v-if="getSortIcon('todayChange')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">
                    <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto"
                      @click="handleSort('marketValue')">
                      <span>{{ $t('portfolioPage.marketValue') }}</span>
                      <component :is="getSortIcon('marketValue')" v-if="getSortIcon('marketValue')" class="w-4 h-4" />
                    </button>
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                    <button class="flex items-center justify-end space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none ml-auto" @click="handleSort('gainLoss')">
                      <span>{{ $t('portfolioPage.gainLoss') }}</span>
                      <component :is="getSortIcon('gainLoss')" v-if="getSortIcon('gainLoss')" class="w-4 h-4" />
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
                    {{ formatNumber(holding.quantity, 0) }}
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {{ formatCurrency(holding.avgPrice, { decimals: 2 }) }}
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {{ formatCurrency(holding.quantity * holding.avgPrice, { decimals: 0 }) }}
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {{ formatCurrency(holding.currentPrice || holding.avgPrice, { decimals: 2 }) }}
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-right">
                    <span v-if="holding.regularMarketChangePercent !== null && holding.regularMarketChangePercent !== undefined"
                      :class="holding.regularMarketChangePercent >= 0 ? 'text-green-600' : 'text-red-600'">
                      {{ formatPercentage(holding.regularMarketChangePercent) }}
                    </span>
                    <span v-else class="text-gray-400">N/A</span>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {{ formatCurrency(holding.quantity * (holding.currentPrice || holding.avgPrice), { decimals: 0 }) }}
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-sm text-right">
                    <span :class="getGainLossColor(holding)">
                      {{ getHoldingGainLoss(holding) >= 0 ? '+' : '-' }}{{ formatCurrency(Math.abs(getHoldingGainLoss(holding)), { decimals: 0 }) }}
                      ({{ getHoldingGainLoss(holding) >= 0 ? '+' : '-' }}{{ Math.abs(getHoldingGainLossPercentage(holding)).toFixed(2) }}%)
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

        <!-- Portfolio Overview Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <!-- Winners -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ArrowTrendingUpIcon class="w-5 h-5 text-green-500 mr-2" />
              {{ $t('portfolioPage.winners') }}
            </h3>
            <div v-if="winners.length > 0" class="space-y-3">
              <div v-for="holding in winners" :key="holding.id" class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                    <ArrowTrendingUpIcon class="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</p>
                    <p v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400">{{ holding.instrumentName }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatCurrency(holding.currentPrice || holding.avgPrice, { decimals: 2 }) }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-green-600 dark:text-green-400 font-medium">
                    {{ formatPercentage(holding.regularMarketChangePercent) }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('portfolioPage.todayChange') }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noPositivePerformers') }}</p>
            </div>
          </div>

          <!-- Losers -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ArrowTrendingDownIcon class="w-5 h-5 text-red-500 mr-2" />
              {{ $t('portfolioPage.losers') }}
            </h3>
            <div v-if="losers.length > 0" class="space-y-3">
              <div v-for="holding in losers" :key="holding.id" class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-3">
                    <ArrowTrendingDownIcon class="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</p>
                    <p v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400">{{ holding.instrumentName }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatCurrency(holding.currentPrice || holding.avgPrice, { decimals: 2 }) }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-red-600 dark:text-red-400 font-medium">
                    {{ formatPercentage(holding.regularMarketChangePercent) }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('portfolioPage.todayChange') }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noNegativePerformers') }}</p>
            </div>
          </div>

          <!-- Most Traded -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ChartBarIcon class="w-5 h-5 text-blue-500 mr-2" />
              {{ $t('portfolioPage.mostTraded') }}
            </h3>
            <div v-if="mostTraded.length > 0" class="space-y-3">
              <div v-for="holding in mostTraded" :key="holding.id" class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                    <ChartBarIcon class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</p>
                    <p v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400">{{ holding.instrumentName }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ formatCurrency(holding.currentPrice || holding.avgPrice, { decimals: 2 }) }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ formatVolume((holding as unknown as Record<string, unknown>)['regularMarketVolume'] as number) }}
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('portfolioPage.volume') }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noTradingVolume') }}</p>
            </div>
          </div>
        </div>

        <!-- Portfolio Allocation -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">{{ $t('portfolioPage.portfolioAllocation') }}</h3>
          <div v-if="portfolioStore.portfolioHoldings.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="holding in portfolioStore.portfolioHoldings" :key="holding.id"
              class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center min-w-0 flex-1">
                  <div class="w-4 h-4 rounded-full mr-3 flex-shrink-0" :style="{ backgroundColor: getColorForSymbol(holding.symbol) }" />
                  <div class="min-w-0 flex-1">
                    <div class="font-medium text-gray-900 dark:text-white truncate">{{ holding.symbol }}</div>
                    <div v-if="holding.instrumentName" class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ holding.instrumentName }}</div>
                  </div>
                </div>
                <div class="text-right ml-3 flex-shrink-0">
                  <div class="font-bold text-lg text-gray-900 dark:text-white">{{ getAllocationPercentage(holding).toFixed(1) }}%</div>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                <div class="h-2 rounded-full transition-all duration-300" :style="{
                  backgroundColor: getColorForSymbol(holding.symbol),
                  width: getAllocationPercentage(holding) + '%'
                }" />
              </div>

              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">{{ formatNumber(holding.quantity, 0) }} shares</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(holding.quantity * (holding.currentPrice || holding.avgPrice), { decimals: 0 }) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon class="w-8 h-8 text-gray-400" />
            </div>
            <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noHoldingsToDisplay') }}</p>
          </div>
        </div>

        <!-- Recent Transactions -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('portfolioPage.recentTransactions') }}</h3>
              <div v-if="portfolioStore.loadingTransactions" class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
            </div>
            <div v-if="canEdit" class="flex gap-2">
              <button type="button" class="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300" @click="showAddTransaction = true">
                {{ $t('portfolioPage.addTransaction') }}
              </button>
            </div>
          </div>
          <div class="overflow-x-auto" :class="{ 'opacity-60 pointer-events-none': portfolioStore.loadingTransactions }">
            <table v-if="portfolioStore.portfolioTransactions.length > 0" class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.date') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.symbol') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.type') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.quantity') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.price') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.fees') }}</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.total') }}</th>
                  <th v-if="canEdit" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ $t('portfolioPage.actions') }}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="transaction in portfolioStore.portfolioTransactions.slice(0, 10)" :key="transaction.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatDate(transaction.date) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {{ transaction.symbol }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getTransactionTypeClass(transaction.type)">
                      {{ transaction.type }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ transaction.quantity }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatCurrency(transaction.price) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatCurrency(transaction.fees || 0) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatCurrency(calculateTransactionTotal(transaction), { decimals: 0 }) }}
                  </td>
                  <td v-if="canEdit" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <button class="text-primary-600 hover:text-primary-500 mr-2">{{ $t('portfolioPage.edit') }}</button>
                    <button class="text-red-600 hover:text-red-500">{{ $t('portfolioPage.delete') }}</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="px-6 py-8 text-center">
              <ClockIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p class="text-gray-500 dark:text-gray-400">{{ $t('portfolioPage.noTransactionsFound') }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Add Transaction Modal would go here -->
    <!-- This would be the same modal component used in the current portfolio page -->

    <!-- Import Transactions Modal -->
    <Teleport to="body">
      <LazyPortfolioImportTransactionsModal v-if="showImportTransactions" v-model="showImportTransactions" @success="handleImportSuccess" />
    </Teleport>

    <!-- Debug info (remove this later) -->
    <div v-if="false" class="fixed bottom-4 right-4 bg-black text-white p-2 text-xs z-50">
      showImportTransactions: {{ showImportTransactions }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PencilSquareIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'

import StatCard from '../../components/Portfolio/StatCard.vue'
import InsightsBox from '../../components/Portfolio/InsightsBox.vue'

const route = useRoute()
const portfolioStore = usePortfolioStore()
const { loggedIn, user, canManagePortfolios } = useAuthorization()
const { formatCurrency, formatNumber, formatPercentage, formatPercentageChange, formatCurrencyChange } = useCurrency()
const { formatDate, formatDateTime } = useDateTime()
const { t } = useI18n()

const showAddTransaction = ref(false)
const showImportTransactions = ref(false)

// Sorting state
const sortColumn = ref<string>('symbol')
const sortDirection = ref<'asc' | 'desc'>('asc')

// Sort options for different columns
type SortKey = 'symbol' | 'instrumentName' | 'quantity' | 'avgPrice' | 'cost' | 'currentPrice' | 'todayChange' | 'marketValue' | 'gainLoss' | 'gainLossPercent'

// Get portfolio ID from route
const portfolioId = computed(() => route.params.id as string)

// Function to try fetching a specific portfolio when store initialization fails
async function tryFetchSpecificPortfolio() {
  try {
    await portfolioStore.fetchSpecificPortfolio(portfolioId.value)
  } catch (error) {
    console.error('Failed to fetch specific portfolio:', error)
  }
}

// Initialize store data - only if not already initialized
onMounted(async () => {
  try {
    if (portfolioStore.allPortfolios.length === 0) {
      await portfolioStore.initialize()
    }
  } catch (error) {
    console.warn('Store initialization failed (likely authentication issue), will try to fetch specific portfolio:', error)
    // Fallback: try to fetch the specific portfolio from public portfolios
    try {
      await portfolioStore.fetchPublicPortfolios()
    } catch (publicError) {
      console.error('Failed to fetch public portfolios:', publicError)
    }
  }

  // If we still don't have the portfolio data, try to set it directly
  if (!currentPortfolio.value && portfolioId.value) {
    await tryFetchSpecificPortfolio()
  }
})

// Server-side: Try to initialize portfolios during SSR
if (import.meta.server) {
  try {
    // Try to fetch public portfolios during SSR
    await portfolioStore.fetchPublicPortfolios()
    // If the specific portfolio isn't in public portfolios, try to fetch it
    if (!portfolioStore.publicPortfolios.find(p => p.id === portfolioId.value)) {
      await portfolioStore.fetchSpecificPortfolio(portfolioId.value)
    }
  } catch (error) {
    console.error('SSR portfolio initialization failed:', error)
  }
}

// Get current portfolio
const currentPortfolio = computed(() => {
  return portfolioStore.allPortfolios.find(p => p.id === portfolioId.value)
})

// Check if user can edit this portfolio
const canEdit = computed(() => {
  if (!loggedIn.value || !user.value) return false
  // Only portfolio owners or admins can edit
  return portfolioStore.canManagePortfolios ||
    (currentPortfolio.value && currentPortfolio.value.userId === user.value.id)
})

// Check if user is admin (for admin edit button)
const isAdmin = computed(() => {
  return loggedIn.value && canManagePortfolios.value
})

// Enhanced portfolio data (including ATH and market data timing)
const enhancedData = ref({
  athValue: null as number | null,
  athDate: null as string | null,
  athDrawdown: 0,
  daysSinceAth: null as number | null,
  isAtAth: false,
  dailyChangeValue: 0,
  dailyChangePercentage: 0,
  lastUpdated: null as string | null,
  marketDataLastUpdated: null as string | null
})

const refreshingEnhanced = ref(false)
const lastKnownChange = ref<string | null>(null)

// Current time for dynamic relative time display
const currentTime = ref(new Date())

// Update current time every 5 seconds for dynamic relative time
let timeInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 5000) // Update every 5 seconds
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

// Fetch enhanced data when portfolio changes
const fetchEnhancedData = async () => {
  if (!currentPortfolio.value) return

  try {
    console.log('[ENHANCED] Fetching enhanced portfolio data...')
    const response = await $fetch(`/api/portfolios/${currentPortfolio.value.id}/enhanced`)
    // Update only the properties that exist in the response
    enhancedData.value = {
      ...enhancedData.value,
      ...response,
      marketDataLastUpdated: response.marketDataLastUpdated || null
    }
    // Update portfolio store timestamp for real-time updates
    portfolioStore.updateTimestamp()
    console.log('[ENHANCED] Enhanced data fetched successfully')
  } catch (error) {
    console.error('[ENHANCED] Failed to fetch enhanced portfolio data:', error)
  }
}

// Smart polling: only fetch if data has actually changed
const checkForUpdates = async () => {
  if (!currentPortfolio.value || document.hidden || refreshingEnhanced.value) return

  try {
    const response = await $fetch(`/api/portfolios/${currentPortfolio.value.id}/last-change`)

    // If this is the first check or data has changed, fetch updates
    if (!lastKnownChange.value || response.lastChange !== lastKnownChange.value) {
      console.log('Portfolio data changed, fetching updates...')
      lastKnownChange.value = response.lastChange

      // Fetch both enhanced data and holdings in parallel
      await Promise.all([
        fetchEnhancedData(),
        portfolioStore.fetchHoldings(currentPortfolio.value.id)
      ])
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
  }
}

// Start smart polling
const startSmartPolling = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  // Check for changes every 30 seconds (much more efficient than fetching data every minute)
  refreshInterval = setInterval(checkForUpdates, 30 * 1000)
}

// Stop polling
const stopSmartPolling = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Dynamic relative time that updates every 5 seconds
const dynamicRelativeTime = computed(() => {
  const lastUpdate = enhancedData.value.marketDataLastUpdated || enhancedData.value.lastUpdated

  if (!lastUpdate) return t('time.justNow')

  const now = currentTime.value.getTime()
  const lastUpdateTime = new Date(lastUpdate).getTime()
  const diffMs = now - lastUpdateTime

  if (diffMs < 30000) { // Less than 30 seconds
    return t('time.justNow')
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 60) {
    return t('time.minutesAgo', { count: diffMinutes })
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 24) {
    return t('time.hoursAgo', { count: diffHours })
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return t('time.daysAgo', { count: diffDays })
})

// Market data last updated timestamp
const marketDataLastUpdated = computed(() => {
  return enhancedData.value.marketDataLastUpdated || currentPortfolio.value?.updatedAt
})

// Manual refresh for enhanced data
const refreshEnhancedData = async () => {
  if (!currentPortfolio.value || refreshingEnhanced.value) return

  try {
    refreshingEnhanced.value = true
    console.log('[REFRESH] Starting enhanced data refresh...')
    console.log('[REFRESH] Fetching enhanced data and holdings in parallel...')

    // Refresh both enhanced data and holdings to get updated market prices
    await Promise.all([
      fetchEnhancedData(),
      portfolioStore.fetchHoldings(currentPortfolio.value.id)
    ])

    console.log('[REFRESH] Both enhanced data and holdings fetch completed')
    // Force a timestamp update to trigger reactivity
    portfolioStore.updateTimestamp()
    console.log('[REFRESH] Enhanced data refresh completed')
  } catch (error) {
    console.error('[REFRESH] Failed to refresh enhanced data:', error)
  } finally {
    refreshingEnhanced.value = false
  }
}

// Watch for portfolio changes and fetch enhanced data
watch(currentPortfolio, async (newPortfolio: typeof currentPortfolio.value) => {
  if (newPortfolio) {
    // Reset the change tracking for new portfolio
    lastKnownChange.value = null

    // Fetch initial data and set baseline
    await fetchEnhancedData()

    // Set initial change timestamp to prevent immediate re-fetch
    try {
      const response = await $fetch(`/api/portfolios/${newPortfolio.id}/last-change`)
      lastKnownChange.value = response.lastChange
    } catch (error) {
      console.error('Failed to set initial change timestamp:', error)
    }
  }
}, { immediate: true })

// REMOVED: Redundant watchers that were causing feedback loops
// The smart polling will handle updates more efficiently

// Smart polling setup - much more efficient than constant fetching
let refreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Start smart polling that only fetches when data actually changes
  startSmartPolling()
})

onUnmounted(() => {
  // Clean up polling
  stopSmartPolling()
})

// Refresh when tab becomes visible again
useEventListener(document, 'visibilitychange', async () => {
  if (!document.hidden && currentPortfolio.value) {
    // Check for updates immediately when tab becomes visible
    await checkForUpdates()
  }
})

// Calculate daily change data based on holdings
const dailyChangeData = computed(() => {
  // Use enhanced data if available, otherwise calculate from holdings
  if (enhancedData.value.dailyChangeValue !== 0 || enhancedData.value.dailyChangePercentage !== 0) {
    const currencyChange = formatCurrencyChange(enhancedData.value.dailyChangeValue, 'NOK')
    const percentageChange = formatPercentageChange(enhancedData.value.dailyChangePercentage)

    return {
      value: enhancedData.value.dailyChangeValue,
      percentage: enhancedData.value.dailyChangePercentage,
      currencyValue: currencyChange.value,
      percentageValue: percentageChange.value,
      isPositive: currencyChange.isPositive,
      isNegative: currencyChange.isNegative,
      isZero: currencyChange.isZero
    }
  }

  // Fallback calculation from holdings
  let totalDailyChange = 0
  let totalMarketValue = 0

  for (const holding of portfolioStore.portfolioHoldings) {
    const marketValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
    const changePercent = holding.regularMarketChangePercent || 0
    const changeValue = (marketValue * changePercent) / 100

    totalDailyChange += changeValue
    totalMarketValue += marketValue
  }

  const changePercentage = totalMarketValue > 0 ? (totalDailyChange / totalMarketValue) * 100 : 0

  const currencyChange = formatCurrencyChange(totalDailyChange, 'NOK')
  const percentageChange = formatPercentageChange(changePercentage)

  return {
    value: totalDailyChange,
    percentage: changePercentage,
    currencyValue: currencyChange.value,
    percentageValue: percentageChange.value,
    isPositive: currencyChange.isPositive,
    isNegative: currencyChange.isNegative,
    isZero: currencyChange.isZero
  }
})

// ATH (All-Time High) data
const athData = computed(() => {
  // Use enhanced data first
  if (enhancedData.value.athValue && enhancedData.value.athDate) {
    return {
      value: formatCurrency(enhancedData.value.athValue, { decimals: 0 }),
      dateText: formatDateTime(enhancedData.value.athDate),
      isAtAth: enhancedData.value.isAtAth
    }
  }

  // Fallback to portfolio store data
  if (!currentPortfolio.value) {
    return {
      value: 'N/A',
      dateText: 'N/A',
      isAtAth: false
    }
  }

  const athValue = currentPortfolio.value.athValue
  const athDate = currentPortfolio.value.athDate

  if (!athValue || !athDate) {
    return {
      value: 'Not set',
      dateText: 'Never',
      isAtAth: false
    }
  }

  const currentValue = portfolioStore.totalValue
  const isAtAth = Math.abs(currentValue - athValue) / athValue < 0.001 // Within 0.1%

  return {
    value: formatCurrency(athValue, { decimals: 0 }),
    dateText: formatDateTime(athDate),
    isAtAth
  }
})

// Load portfolio data when route changes
watch(portfolioId, async (newId: string) => {
  if (newId && currentPortfolio.value) {
    try {
      await portfolioStore.setCurrentPortfolio(newId)
    } catch (error) {
      console.error('Failed to load portfolio:', error)
    }
  }
}, { immediate: true })

// Computed properties for enhanced portfolio analytics
const topPerformers = computed(() => {
  return portfolioStore.portfolioHoldings
    .filter(holding => holding.currentPrice != null && getHoldingGainLoss(holding) > 0)
    .sort((a, b) => getHoldingGainLoss(b) - getHoldingGainLoss(a))
    .slice(0, 3)
})

// Winners - holdings with positive intraday performance
const winners = computed(() => {
  return portfolioStore.portfolioHoldings
    .filter(holding => holding.currentPrice != null && holding.regularMarketChangePercent != null && holding.regularMarketChangePercent > 0)
    .sort((a, b) => {
      const aChange = a.regularMarketChangePercent || 0
      const bChange = b.regularMarketChangePercent || 0
      return bChange - aChange
    })
    .slice(0, 5)
})

// Losers - holdings with negative intraday performance
const losers = computed(() => {
  return portfolioStore.portfolioHoldings
    .filter(holding => holding.currentPrice != null && holding.regularMarketChangePercent != null && holding.regularMarketChangePercent < 0)
    .sort((a, b) => {
      const aChange = a.regularMarketChangePercent || 0
      const bChange = b.regularMarketChangePercent || 0
      return aChange - bChange
    })
    .slice(0, 5)
})

// Most traded - holdings with highest intraday trading volume
const mostTraded = computed(() => {
  return portfolioStore.portfolioHoldings
    .filter(holding => {
      const volume = (holding as unknown as Record<string, unknown>)['regularMarketVolume']
      return holding.currentPrice != null && volume != null && Number(volume) > 0
    })
    .sort((a, b) => {
      const aVolume = Number((a as unknown as Record<string, unknown>)['regularMarketVolume']) || 0
      const bVolume = Number((b as unknown as Record<string, unknown>)['regularMarketVolume']) || 0
      return bVolume - aVolume
    })
    .slice(0, 5)
})

// Sorted holdings based on current sort column and direction
const sortedHoldings = computed(() => {
  const holdings = [...portfolioStore.portfolioHoldings]

  return holdings.sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortColumn.value as SortKey) {
      case 'symbol':
        aValue = a.symbol.toLowerCase()
        bValue = b.symbol.toLowerCase()
        break
      case 'instrumentName':
        aValue = (a.instrumentName || a.symbol).toLowerCase()
        bValue = (b.instrumentName || b.symbol).toLowerCase()
        break
      case 'quantity':
        aValue = a.quantity
        bValue = b.quantity
        break
      case 'avgPrice':
        aValue = a.avgPrice
        bValue = b.avgPrice
        break
      case 'cost':
        aValue = a.quantity * a.avgPrice
        bValue = b.quantity * b.avgPrice
        break
      case 'currentPrice':
        aValue = a.currentPrice || a.avgPrice
        bValue = b.currentPrice || b.avgPrice
        break
      case 'todayChange':
        aValue = a.regularMarketChangePercent || 0
        bValue = b.regularMarketChangePercent || 0
        break
      case 'marketValue':
        aValue = a.quantity * (a.currentPrice || a.avgPrice)
        bValue = b.quantity * (b.currentPrice || b.avgPrice)
        break
      case 'gainLoss':
        aValue = getHoldingGainLoss(a)
        bValue = getHoldingGainLoss(b)
        break
      case 'gainLossPercent':
        aValue = getHoldingGainLossPercentage(a)
        bValue = getHoldingGainLossPercentage(b)
        break
      default:
        aValue = a.symbol.toLowerCase()
        bValue = b.symbol.toLowerCase()
    }

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = 0
    if (bValue === null || bValue === undefined) bValue = 0

    let result = 0
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      result = aValue.localeCompare(bValue)
    } else {
      result = (aValue as number) - (bValue as number)
    }

    return sortDirection.value === 'desc' ? -result : result
  })
})

// Function to handle column sorting
function handleSort(column: SortKey) {
  if (sortColumn.value === column) {
    // Toggle direction if clicking the same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // Set new column and default to ascending
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

// Function to get sort icon for a column
function getSortIcon(column: SortKey) {
  if (sortColumn.value !== column) return null
  return sortDirection.value === 'asc' ? ChevronUpIcon : ChevronDownIcon
}

const totalPortfolioValue = computed(() => {
  return portfolioStore.portfolioHoldings.reduce((total, holding) => {
    return total + (holding.quantity * (holding.currentPrice || holding.avgPrice))
  }, 0)
})

// Get allocation percentage for a holding
function getAllocationPercentage(holding: { quantity: number; currentPrice?: number | null; avgPrice: number }): number {
  const holdingValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
  const total = totalPortfolioValue.value
  return total > 0 ? (holdingValue / total) * 100 : 0
}

// Get a consistent color for each symbol
function getColorForSymbol(symbol: string): string {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length] as string
}

// Get transaction type styling
function getTransactionTypeClass(type: string): string {
  switch (type) {
    case 'BUY':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'SELL':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    case 'DIVIDEND':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'SPLIT':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    case 'MERGER':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
}

// Calculate transaction total with fees
function calculateTransactionTotal(transaction: { type: string; quantity: number; price: number; fees?: number }): number {
  const amount = transaction.quantity * transaction.price
  const fees = transaction.fees || 0

  // For purchases (BUY), total is amount + fees (money going out)
  // For sales (SELL), total is amount - fees (money coming in)
  // For other types, follow the same logic based on cash flow direction

  switch (transaction.type) {
    case 'BUY':
    case 'RIGHTS_ALLOCATION':
    case 'RIGHTS_ISSUE':
      // Money going out (amount + fees)
      return amount + fees

    case 'SELL':
    case 'DIVIDEND':
    case 'DIVIDEND_REINVEST':
    case 'DEPOSIT':
    case 'REFUND':
    case 'LIQUIDATION':
    case 'REDEMPTION':
    case 'DECIMAL_LIQUIDATION':
    case 'SPIN_OFF_IN':
    case 'TRANSFER_IN':
    case 'EXCHANGE_IN':
      // Money coming in (amount - fees)
      return amount - fees

    case 'WITHDRAWAL':
    case 'DECIMAL_WITHDRAWAL':
    case 'INTEREST_CHARGE':
    case 'EXCHANGE_OUT':
      // Money going out (amount + fees)
      return amount + fees

    default:
      // For unknown types, just show amount - fees
      return amount - fees
  }
}

// Get holding gain/loss
function getHoldingGainLoss(holding: { quantity: number; currentPrice?: number | null; avgPrice: number }): number {
  const currentValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
  const costBasis = holding.quantity * holding.avgPrice
  return currentValue - costBasis
}

// Get holding gain/loss percentage
function getHoldingGainLossPercentage(holding: { quantity: number; currentPrice?: number | null; avgPrice: number }): number {
  const costBasis = holding.quantity * holding.avgPrice
  if (costBasis === 0) return 0
  return (getHoldingGainLoss(holding) / costBasis) * 100
}

// Get gain/loss color class
function getGainLossColor(holding: { quantity: number; currentPrice?: number | null; avgPrice: number }): string {
  const gainLoss = getHoldingGainLoss(holding)
  return gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
}

// Get the symbol of the top performing holding
function getTopPerformerSymbol(): string {
  if (topPerformers.value.length === 0) return 'N/A'
  return topPerformers.value[0]?.symbol || 'N/A'
}

// Get the symbol of the largest holding by value
function getLargestHoldingSymbol(): string {
  if (portfolioStore.portfolioHoldings.length === 0) return 'N/A'

  const largest = portfolioStore.portfolioHoldings.reduce((max, holding) => {
    const maxValue = max.quantity * (max.currentPrice || max.avgPrice)
    const holdingValue = holding.quantity * (holding.currentPrice || holding.avgPrice)
    return holdingValue > maxValue ? holding : max
  })

  return largest.symbol
}

// Format volume with appropriate units (K, M, B)
function formatVolume(volume: number | null | undefined): string {
  if (!volume || volume === 0) return 'N/A'

  const num = Math.abs(volume)
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B'
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M'
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K'
  } else {
    return num.toString()
  }
}

// Refresh prices
async function refreshPrices(): Promise<void> {
  try {
    console.log('Starting price refresh...')
    await portfolioStore.updatePrices()
    console.log('Price refresh completed successfully')
    // Force a timestamp update to ensure reactivity
    portfolioStore.updateTimestamp()
  } catch (error) {
    console.error('Failed to refresh prices:', error)
    // You might want to show a toast notification here
  }
}

// Handle import success
function handleImportSuccess(): void {
  // The import modal will already refresh the portfolio data
  showImportTransactions.value = false
}

// Page meta
useHead({
  title: computed(() => currentPortfolio.value ? currentPortfolio.value.name : t('portfolio.portfolio')),
  meta: [
    {
      name: 'description', content: computed(() =>
        currentPortfolio.value ?
          `${t('portfolio.portfolio')}: ${currentPortfolio.value.name} - ${currentPortfolio.value.description || t('common.managementDescription')}` :
          t('portfolioPage.notFound')
      )
    }
  ]
})
</script>

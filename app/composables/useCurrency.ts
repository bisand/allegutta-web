/**
 * Currency formatting composable with locale awareness
 */

export interface CurrencyFormatOptions {
  currency?: string
  decimals?: number
  showCurrencySymbol?: boolean
  compactDisplay?: boolean
}

export function useCurrency() {
  const { locale, t } = useI18n()
  
  // Get currency settings from locale configuration
  const getLocaleCurrencyConfig = () => {
    return {
      currency: t('currency.defaultCurrency', 'USD'),
      decimals: parseInt(t('currency.decimals', '2')),
      symbol: t('currency.symbol', '$')
    }
  }
  
  // Locale mapping for Intl.NumberFormat
  const localeMapping: Record<string, string> = {
    'no': 'nb-NO',
    'en': 'en-US'
  }
  
  /**
   * Format a number without currency symbol (for quantities, etc.)
   */
  function formatNumber(
    value: number,
    decimalPlaces: number = 0
  ): string {
    const localeCode = localeMapping[locale.value] || 'en-US'
    
    return new Intl.NumberFormat(localeCode, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(value)
  }

  /**
   * Format a percentage with appropriate styling
   */
  function formatPercentage(
    value: number | null | undefined,
    decimalPlaces: number = 2
  ): string {
    if (value === null || value === undefined) return 'N/A'
    
    const localeCode = localeMapping[locale.value] || 'en-US'
    
    return new Intl.NumberFormat(localeCode, {
      style: 'percent',
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
      signDisplay: 'exceptZero'
    }).format(value / 100)
  }

  /**
   * Format a number as currency with locale-specific formatting
   */
  function formatCurrency(
    value: number, 
    options: CurrencyFormatOptions = {}
  ): string {
    const config = getLocaleCurrencyConfig()
    const {
      currency = config.currency,
      decimals = config.decimals,
      showCurrencySymbol = false,
      compactDisplay = false
    } = options

    const localeCode = localeMapping[locale.value] || 'en-US'
    
    const formatOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }

    if (showCurrencySymbol) {
      formatOptions.style = 'currency'
      formatOptions.currency = currency
    }

    if (compactDisplay && Math.abs(value) >= 1000) {
      formatOptions.notation = 'compact'
      formatOptions.compactDisplay = 'short'
    }

    return new Intl.NumberFormat(localeCode, formatOptions).format(value)
  }

  /**
   * Format a number as currency without the currency symbol
   */
  function formatAmount(
    value: number,
    decimalPlaces?: number
  ): string {
    const config = getLocaleCurrencyConfig()
    return formatCurrency(value, {
      showCurrencySymbol: false,
      decimals: decimalPlaces ?? config.decimals
    })
  }

  /**
   * Format a large number in compact form (e.g., 1.2M, 5.3K)
   */
  function formatCompactCurrency(
    value: number,
    options: CurrencyFormatOptions = {}
  ): string {
    return formatCurrency(value, {
      ...options,
      compactDisplay: true
    })
  }

  /**
   * Get the currency symbol for the current locale
   */
  function getCurrencySymbol(currency?: string): string {
    const config = getLocaleCurrencyConfig()
    const currencyCode = currency || config.currency
    const localeCode = localeMapping[locale.value] || 'en-US'
    
    return new Intl.NumberFormat(localeCode, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(0).replace(/[\d\s]/g, '')
  }

  /**
   * Get the default currency for the current locale
   */
  function getDefaultCurrency(): string {
    const config = getLocaleCurrencyConfig()
    return config.currency
  }

  /**
   * Formats a percentage change with proper styling indicators
   */
  function formatPercentageChange(
    change: number | null | undefined,
    options?: { showSign?: boolean; decimals?: number }
  ): { value: string; isPositive: boolean; isNegative: boolean; isZero: boolean } {
    const { showSign = true, decimals = 2 } = options || {}
    
    if (change === null || change === undefined || isNaN(change)) {
      return { value: 'N/A', isPositive: false, isNegative: false, isZero: false }
    }
    
    const isPositive = change > 0
    const isNegative = change < 0
    const isZero = change === 0
    
    const localeCode = localeMapping[locale.value] || 'en-US'
    
    let value: string
    try {
      value = new Intl.NumberFormat(localeCode, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay: showSign ? 'always' : 'auto'
      }).format(change / 100)
    } catch {
      // Fallback formatting
      const sign = showSign && isPositive ? '+' : ''
      value = `${sign}${change.toFixed(decimals)}%`
    }
    
    return { value, isPositive, isNegative, isZero }
  }
  
  /**
   * Formats an absolute change in currency with styling indicators
   */
  function formatCurrencyChange(
    change: number | null | undefined,
    currency: string = 'NOK',
    options?: { showSign?: boolean; decimals?: number }
  ): { value: string; isPositive: boolean; isNegative: boolean; isZero: boolean } {
    const { showSign = true, decimals = 2 } = options || {}
    
    if (change === null || change === undefined || isNaN(change)) {
      return { value: 'N/A', isPositive: false, isNegative: false, isZero: false }
    }
    
    const isPositive = change > 0
    const isNegative = change < 0
    const isZero = change === 0
    
    const localeCode = localeMapping[locale.value] || 'en-US'
    
    let value: string
    try {
      value = new Intl.NumberFormat(localeCode, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay: showSign ? 'always' : 'auto'
      }).format(change)
    } catch {
      // Fallback formatting
      const sign = showSign && isPositive ? '+' : ''
      value = `${sign}${currency} ${change.toFixed(decimals)}`
    }
    
    return { value, isPositive, isNegative, isZero }
  }

  return {
    formatCurrency,
    formatAmount,
    formatCompactCurrency,
    formatNumber,
    formatPercentage,
    formatPercentageChange,
    formatCurrencyChange,
    getCurrencySymbol,
    getDefaultCurrency
  }
}

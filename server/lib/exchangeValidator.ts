/**
 * Exchange and Currency Validation Utilities
 * Prevents Norwegian stocks from using foreign exchanges
 */

export interface MarketDataValidation {
  symbol: string
  isin?: string
  exchange: string
  currency: string
  isValid: boolean
  expectedExchange?: string
  issues: string[]
}

/**
 * Validates that Norwegian ISINs use OSL exchange and NOK currency
 */
export function validateNorwegianStock(symbol: string, isin?: string, exchange?: string, currency?: string, symbolYahoo?: string): MarketDataValidation {
  const issues: string[] = []
  let isValid = true
  let expectedExchange: string | undefined

  // Check if this is a Norwegian ISIN
  const isNorwegianISIN = isin?.startsWith('NO')
  
  if (isNorwegianISIN) {
    expectedExchange = 'OSL'
    
    // Validate exchange
    if (exchange && exchange !== 'OSL') {
      issues.push(`Norwegian stock ${symbol} (${isin}) should use OSL exchange, not ${exchange}`)
      isValid = false
    }
    
    // Validate currency
    if (currency && currency !== 'NOK') {
      issues.push(`Norwegian stock ${symbol} (${isin}) should use NOK currency, not ${currency}`)
      isValid = false
    }
    
    // Validate symbolYahoo format (should end with .OL for Yahoo Finance)
    if (symbolYahoo && !symbolYahoo.endsWith('.OL')) {
      issues.push(`Norwegian stock ${symbol} should use .OL suffix in symbolYahoo field (currently: ${symbolYahoo})`)
      isValid = false
    }
  }

  return {
    symbol,
    isin,
    exchange: exchange || 'unknown',
    currency: currency || 'unknown', 
    isValid,
    expectedExchange,
    issues
  }
}

/**
 * Suggests correct Yahoo symbol for Norwegian stocks
 */
export function suggestCorrectSymbol(symbol: string, isin?: string): string {
  // If Norwegian ISIN and symbol doesn't end with .OL, suggest the correct format
  if (isin?.startsWith('NO') && !symbol.endsWith('.OL')) {
    return `${symbol}.OL`
  }
  return symbol
}

/**
 * Validates multiple market data records
 */
export function validateMarketDataBatch(records: Array<{
  symbol: string
  isin?: string
  exchange?: string
  currency?: string
}>): MarketDataValidation[] {
  return records.map(record => 
    validateNorwegianStock(record.symbol, record.isin, record.exchange, record.currency)
  )
}

/**
 * Common price validation - flags prices that seem unrealistic
 */
export function validatePrice(symbol: string, price: number, currency: string = 'NOK'): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  // Basic sanity checks
  if (price <= 0) {
    issues.push(`Invalid price for ${symbol}: ${price}`)
  }
  
  // Currency-specific checks
  if (currency === 'NOK' && price < 0.01) {
    issues.push(`Suspiciously low NOK price for ${symbol}: ${price}`)
  }
  
  if (currency === 'USD' && price > 10000) {
    issues.push(`Suspiciously high USD price for ${symbol}: ${price}`)
  }
  
  // Cross-currency validation: if Norwegian stock has USD price, it might be wrong exchange
  if (symbol.includes('.OL') && currency === 'USD') {
    issues.push(`Norwegian stock ${symbol} has USD price - might be wrong exchange`)
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

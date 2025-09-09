/**
 * Transaction Data Validation System
 * Validates transaction data during import to prevent data integrity issues
 */

export interface TransactionValidation {
  isValid: boolean
  warnings: string[]
  errors: string[]
  suggestions: string[]
}

/**
 * Validates transaction data for potential issues
 */
export function validateTransaction(transaction: {
  symbol?: string
  isin?: string
  type: string
  quantity: number
  price: number
  date: Date | string
  amount?: number
  fees?: number
}): TransactionValidation {
  const warnings: string[] = []
  const errors: string[] = []
  const suggestions: string[] = []

  // Date validation
  const transactionDate = typeof transaction.date === 'string' ? new Date(transaction.date) : transaction.date
  const now = new Date()
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

  if (transactionDate > oneYearFromNow) {
    errors.push(`Transaction date ${transactionDate.toISOString().split('T')[0]} is more than a year in the future`)
  }

  if (transactionDate < new Date('1900-01-01')) {
    errors.push(`Transaction date ${transactionDate.toISOString().split('T')[0]} is unrealistically old`)
  }

  // Price validation
  if (transaction.price <= 0) {
    errors.push(`Invalid price: ${transaction.price}`)
  }

  if (transaction.price > 100000) {
    warnings.push(`Unusually high price: ${transaction.price} - please verify`)
  }

  // Quantity validation  
  if (transaction.quantity === 0) {
    warnings.push('Zero quantity transaction - this might be a data entry error')
  }

  // Transaction type specific validation
  if (transaction.type === 'REFUND') {
    if (transaction.symbol && !transaction.symbol.startsWith('CASH_')) {
      suggestions.push('REFUND transactions typically should not affect stock holdings - consider if this should be a cash transaction')
    }
  }

  if (['BUY', 'SELL'].includes(transaction.type)) {
    if (!transaction.symbol || transaction.symbol.startsWith('CASH_')) {
      errors.push(`${transaction.type} transaction requires a valid stock symbol`)
    }
  }

  // ISIN validation for Norwegian stocks
  if (transaction.isin?.startsWith('NO') && transaction.symbol) {
    if (transaction.symbol.includes('.')) {
      suggestions.push(`Norwegian ISIN detected - consider using base symbol '${transaction.symbol.split('.')[0]}' instead of '${transaction.symbol}'`)
    }
  }

  // Amount vs calculated amount validation
  if (transaction.amount !== undefined) {
    const calculatedAmount = transaction.quantity * transaction.price + (transaction.fees || 0)
    const difference = Math.abs(transaction.amount - calculatedAmount)

    if (difference > 1) { // Allow small rounding differences
      warnings.push(`Amount mismatch: provided ${transaction.amount}, calculated ${calculatedAmount.toFixed(2)}`)
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    suggestions
  }
}

/**
 * Validates an array of transactions and returns summary
 */
export function validateTransactionBatch(transactions: Array<{
  symbol?: string
  isin?: string
  type: string
  quantity: number
  price: number
  date: Date | string
  amount?: number
  fees?: number
}>): {
  validTransactions: number
  invalidTransactions: number
  totalWarnings: number
  totalSuggestions: number
  validationResults: TransactionValidation[]
} {
  const validationResults = transactions.map(validateTransaction)

  return {
    validTransactions: validationResults.filter(r => r.isValid).length,
    invalidTransactions: validationResults.filter(r => !r.isValid).length,
    totalWarnings: validationResults.reduce((sum, r) => sum + r.warnings.length, 0),
    totalSuggestions: validationResults.reduce((sum, r) => sum + r.suggestions.length, 0),
    validationResults
  }
}

/**
 * Creates a validation report for CSV import
 */
export function generateImportValidationReport(
  validationResults: TransactionValidation[],
  originalData: Array<{
    symbol?: string
    isin?: string
    type: string
    quantity: number
    price: number
    date: Date | string
    amount?: number
    fees?: number
  }>
): string {
  const report: string[] = []

  report.push('=== TRANSACTION IMPORT VALIDATION REPORT ===\n')

  const summary = validateTransactionBatch(originalData)
  report.push(`📊 Summary:`)
  report.push(`   Valid: ${summary.validTransactions}`)
  report.push(`   Invalid: ${summary.invalidTransactions}`)
  report.push(`   Warnings: ${summary.totalWarnings}`)
  report.push(`   Suggestions: ${summary.totalSuggestions}\n`)

  // List critical issues
  const criticalIssues: string[] = []
  validationResults.forEach((result, index) => {
    if (result.errors.length > 0) {
      criticalIssues.push(`Line ${index + 1}: ${result.errors.join('; ')}`)
    }
  })

  if (criticalIssues.length > 0) {
    report.push('🚨 Critical Issues (must fix):')
    criticalIssues.forEach(issue => report.push(`   ${issue}`))
    report.push('')
  }

  // List warnings
  const warnings: string[] = []
  validationResults.forEach((result, index) => {
    if (result.warnings.length > 0) {
      warnings.forEach(warning => warnings.push(`Line ${index + 1}: ${warning}`))
    }
  })

  if (warnings.length > 0) {
    report.push('⚠️  Warnings (review recommended):')
    warnings.slice(0, 10).forEach(warning => report.push(`   ${warning}`))
    if (warnings.length > 10) {
      report.push(`   ... and ${warnings.length - 10} more warnings`)
    }
    report.push('')
  }

  return report.join('\n')
}

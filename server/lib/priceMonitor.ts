/**
 * Price Alert and Monitoring System
 * Detects when prices deviate significantly from expected ranges
 */

import { validateNorwegianStock, validatePrice } from './exchangeValidator'

export interface PriceAlert {
  symbol: string
  alertType: 'CURRENCY_MISMATCH' | 'EXCHANGE_MISMATCH' | 'PRICE_DEVIATION' | 'DATA_QUALITY'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  currentValue: unknown
  expectedValue?: unknown
  suggestion?: string
}

/**
 * Analyzes market data for potential issues and generates alerts
 */
export function analyzeMarketData(data: {
  symbol: string
  isin?: string
  currentPrice?: number
  currency?: string
  exchange?: string
  symbolYahoo?: string
}): PriceAlert[] {
  const alerts: PriceAlert[] = []
  
  // Validate Norwegian stocks
  const validation = validateNorwegianStock(data.symbol, data.isin, data.exchange, data.currency, data.symbolYahoo)
  if (!validation.isValid) {
    alerts.push({
      symbol: data.symbol,
      alertType: 'EXCHANGE_MISMATCH',
      severity: 'HIGH',
      message: validation.issues.join('; '),
      currentValue: `${data.exchange}/${data.currency} (symbolYahoo: ${data.symbolYahoo || 'NULL'})`,
      expectedValue: `OSL/NOK (symbolYahoo: ${data.symbol}.OL)`,
      suggestion: `Update symbolYahoo to ${data.symbol}.OL`
    })
  }
  
  // Validate price if available
  if (data.currentPrice) {
    const priceValidation = validatePrice(data.symbol, data.currentPrice, data.currency)
    if (!priceValidation.isValid) {
      alerts.push({
        symbol: data.symbol,
        alertType: 'PRICE_DEVIATION',
        severity: 'MEDIUM',
        message: priceValidation.issues.join('; '),
        currentValue: data.currentPrice
      })
    }
  }
  
  // Check for common mismatches
  if (data.isin?.startsWith('NO') && data.symbolYahoo && !data.symbolYahoo.endsWith('.OL')) {
    alerts.push({
      symbol: data.symbol,
      alertType: 'DATA_QUALITY',
      severity: 'MEDIUM',
      message: 'Norwegian stock should use .OL suffix for Yahoo symbol',
      currentValue: data.symbolYahoo,
      expectedValue: `${data.symbol}.OL`,
      suggestion: 'Update symbolYahoo field'
    })
  }
  
  return alerts
}

/**
 * Scans all market data for issues
 */
export async function scanMarketDataForIssues(): Promise<PriceAlert[]> {
  const prisma = (await import('./prisma')).default
  
  const marketData = await prisma.market_data.findMany({
    select: {
      symbol: true,
      isin: true,
      currentPrice: true,
      currency: true,
      exchange: true,
      symbolYahoo: true
    }
  })
  
  const allAlerts: PriceAlert[] = []
  
  for (const data of marketData) {
    const alerts = analyzeMarketData({
      symbol: data.symbol,
      isin: data.isin ?? undefined,
      currentPrice: data.currentPrice ?? undefined,
      currency: data.currency ?? undefined,
      exchange: data.exchange ?? undefined,
      symbolYahoo: data.symbolYahoo ?? undefined
    })
    allAlerts.push(...alerts)
  }
  
  return allAlerts
}

/**
 * Generates a market data health report
 */
export async function generateMarketDataHealthReport(): Promise<{
  totalRecords: number
  healthyRecords: number
  alertsCount: number
  criticalIssues: number
  alerts: PriceAlert[]
}> {
  const alerts = await scanMarketDataForIssues()
  const criticalIssues = alerts.filter(a => a.severity === 'CRITICAL').length
  
  const prisma = (await import('./prisma')).default
  const totalRecords = await prisma.market_data.count()
  const healthyRecords = totalRecords - alerts.length
  
  return {
    totalRecords,
    healthyRecords,
    alertsCount: alerts.length,
    criticalIssues,
    alerts
  }
}

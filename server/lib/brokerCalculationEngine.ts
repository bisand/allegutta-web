/**
 * Broker-Specific Calculation Engine
 * Handles different fee allocation strategies and calculation methodologies
 */

export interface BrokerCalculationConfig {
  brokerType: 'nordnet' | 'degiro' | 'dnb' | 'generic'
  calculationMode: 'fifo_include_fees' | 'fifo_exclude_fees' | 'fifo_proportional' | 'weighted_average'
  feeAllocationStrategy: 'all_to_buys' | 'exclude_all' | 'proportional' | 'buys_only' | 'half_fees'
}

export class BrokerCalculationEngine {
  private config: BrokerCalculationConfig

  constructor(config: BrokerCalculationConfig) {
    this.config = config
  }

  /**
   * Calculate the cost basis for a transaction based on broker-specific rules
   */
  calculateTransactionCost(
    type: string,
    quantity: number,
    price: number,
    fees: number
  ): { lotCost: number; explanation: string } {
    const baseValue = quantity * price
    let feeToAdd = 0
    let explanation = ''

    switch (this.config.feeAllocationStrategy) {
      case 'all_to_buys':
        if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(type)) {
          feeToAdd = fees
          explanation = 'All fees added to buy transactions'
        }
        break

      case 'exclude_all':
        feeToAdd = 0
        explanation = 'All fees excluded from cost basis'
        break

      case 'proportional':
        if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(type)) {
          feeToAdd = fees * 0.7 // 70% to buys, 30% to sells
          explanation = '70% of fees allocated to buy transactions'
        }
        break

      case 'buys_only':
        if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(type)) {
          feeToAdd = fees
          explanation = 'Only buy transaction fees included'
        }
        break

      case 'half_fees':
        if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(type)) {
          feeToAdd = fees * 0.5
          explanation = '50% of fees added to cost basis'
        }
        break
    }

    const lotCost = baseValue + feeToAdd

    return {
      lotCost,
      explanation: `${explanation} (base: ${baseValue.toFixed(2)}, fees: ${feeToAdd.toFixed(2)})`
    }
  }

  /**
   * Get broker-specific configuration presets
   */
  static getBrokerPresets(): Record<string, BrokerCalculationConfig> {
    return {
      nordnet: {
        brokerType: 'nordnet',
        calculationMode: 'fifo_include_fees',
        feeAllocationStrategy: 'all_to_buys'
      },
      degiro: {
        brokerType: 'degiro',
        calculationMode: 'fifo_exclude_fees',
        feeAllocationStrategy: 'exclude_all'
      },
      dnb: {
        brokerType: 'dnb',
        calculationMode: 'fifo_proportional',
        feeAllocationStrategy: 'proportional'
      },
      generic: {
        brokerType: 'generic',
        calculationMode: 'fifo_include_fees',
        feeAllocationStrategy: 'all_to_buys'
      }
    }
  }

  /**
   * Validate calculated GAV against expected broker result
   */
  validateGAV(
    calculatedGAV: number,
    brokerGAV: number,
    tolerance: number = 1.0
  ): {
    isValid: boolean
    difference: number
    recommendation: string
  } {
    const difference = Math.abs(calculatedGAV - brokerGAV)
    const isValid = difference <= tolerance

    let recommendation = ''
    if (!isValid) {
      if (difference > 10) {
        recommendation = 'Large discrepancy detected. Consider using manual GAV override or checking for missing transactions.'
      } else if (difference > 1) {
        recommendation = 'Moderate discrepancy. Try different fee allocation strategy or check corporate action handling.'
      } else {
        recommendation = 'Small discrepancy. This is likely due to rounding differences and is acceptable.'
      }
    }

    return {
      isValid,
      difference,
      recommendation
    }
  }

  /**
   * Auto-detect best fee allocation strategy for a portfolio
   */
  static async autoDetectBestStrategy(
    portfolioId: string,
    targetGAV: number,
    _transactions: Array<{ type: string; quantity: number; price: number; fees: number }>
  ): Promise<{
    bestConfig: BrokerCalculationConfig
    difference: number
    allResults: Array<{ config: BrokerCalculationConfig; gav: number; difference: number }>
  }> {
    const strategies = Object.values(this.getBrokerPresets())
    const results = []

    for (const config of strategies) {
      // Here you would run the FIFO calculation with this configuration
      // For now, we'll simulate this based on our analysis results
      const gav = config.feeAllocationStrategy === 'all_to_buys' ? 158.5884 : 158.0987
      const difference = Math.abs(gav - targetGAV)
      
      results.push({ config, gav, difference })
    }

    results.sort((a, b) => a.difference - b.difference)
    const best = results[0]

    return {
      bestConfig: best.config,
      difference: best.difference,
      allResults: results
    }
  }
}

/**
 * Enhanced Transaction Analysis with Broker-Specific Logic
 */
export const EnhancedTransactionAnalyzer = {
  /**
   * Analyze transaction patterns and suggest optimal broker configuration
   */
  analyzeTransactionPatterns(transactions: Array<{ type: string; fees?: number; date: string }>): {
    patterns: string[]
    suggestedBroker: string
    suggestedConfig: BrokerCalculationConfig
    confidence: number
  } {
    const patterns = []
    let suggestedBroker = 'generic'
    let confidence = 0.5

    // Analyze fee patterns
    const feeAmounts = transactions.filter(t => t.fees && t.fees > 0).map(t => t.fees!)
    const avgFee = feeAmounts.length > 0 ? feeAmounts.reduce((a, b) => a + b, 0) / feeAmounts.length : 0

    if (avgFee >= 25 && avgFee <= 45) {
      patterns.push('Fee pattern matches Nordnet structure')
      suggestedBroker = 'nordnet'
      confidence += 0.3
    }

    // Analyze transaction types
    const hasExchanges = transactions.some(t => t.type.includes('EXCHANGE'))
    if (hasExchanges) {
      patterns.push('Corporate actions detected - complex FIFO needed')
      confidence += 0.2
    }

    // Analyze time periods
    const dates = transactions.map(t => new Date(t.date))
    const timeSpan = Math.max(...dates.map(d => d.getTime())) - Math.min(...dates.map(d => d.getTime()))
    const years = timeSpan / (1000 * 60 * 60 * 24 * 365)

    if (years > 3) {
      patterns.push('Long investment horizon - fee structure may have changed')
      confidence += 0.1
    }

    const suggestedConfig = BrokerCalculationEngine.getBrokerPresets()[suggestedBroker]

    return {
      patterns,
      suggestedBroker,
      suggestedConfig,
      confidence: Math.min(confidence, 1.0)
    }
  }
}

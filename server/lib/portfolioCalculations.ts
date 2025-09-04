import prisma from './prisma'

// Calculate and update the cash balance for a portfolio
export async function updateCashBalance(portfolioId: string): Promise<void> {
  console.log(`💰 Recalculating cash balance for portfolio: ${portfolioId}`)
  
  // Simple sum of all transaction amounts - the amount field already contains the correct cash impact
  const result = await prisma.$queryRaw<Array<{ total: number | null }>>`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM transactions 
    WHERE portfolioId = ${portfolioId}
  `

  const cashBalance = result[0]?.total || 0

  console.log(`💰 Calculated cash balance: ${cashBalance.toFixed(2)} NOK`)

  // Update the portfolio's cash balance
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { cashBalance }
  })
  
  console.log(`✅ Updated portfolio cash balance to: ${cashBalance.toFixed(2)} NOK`)
}

// Calculate and update holdings for a specific security (not cash)
export async function updateSecurityHoldings(portfolioId: string, symbol: string): Promise<void> {
  // Skip cash symbols - they're handled by updateCashBalance
  if (symbol.startsWith('CASH_')) {
    return
  }
  
  console.log(`🔄 Recalculating security holdings for: ${symbol}`)
  
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      symbol: symbol,
      type: {
        in: [
          'BUY', 'SELL',                    // Standard buy/sell transactions
          'EXCHANGE_IN', 'EXCHANGE_OUT',    // Exchange transactions (treat as buy/sell)
          'SPIN_OFF_IN',                    // Spin-offs that create new holdings
          'DECIMAL_LIQUIDATION',            // Decimal adjustments
          'DECIMAL_WITHDRAWAL',             // Decimal withdrawals
          'REFUND', 'LIQUIDATION', 'REDEMPTION'  // Corporate actions that liquidate positions
        ]
      }
    },
    orderBy: {
      date: 'asc'
    }
  })

  console.log(`📊 Found ${transactions.length} transactions for ${symbol}`)

  let totalQuantity = 0
  let totalCost = 0

  for (const transaction of transactions) {
    const quantity = transaction.quantity
    const price = transaction.price
    const fees = transaction.fees || 0
    
    if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(transaction.type)) {
      // These increase holdings
      totalQuantity += quantity
      totalCost += quantity * price + fees
      console.log(`  ➕ ${transaction.type}: +${quantity} shares`)
    } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
      // These decrease holdings
      const sellQuantity = Math.min(quantity, totalQuantity)
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
      
      totalQuantity -= sellQuantity
      totalCost -= sellQuantity * avgPrice
      totalCost = Math.max(0, totalCost) // Ensure non-negative
      console.log(`  ➖ ${transaction.type}: -${sellQuantity} shares`)
    } else if (['REFUND', 'LIQUIDATION', 'REDEMPTION'].includes(transaction.type)) {
      // Corporate actions that liquidate entire position (like capital repayment)
      console.log(`  💰 ${transaction.type}: LIQUIDATING ${totalQuantity} shares (corporate action)`)
      totalQuantity = 0
      totalCost = 0
    } else if (['DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
      // Handle decimal adjustments - these typically adjust small quantities
      if (transaction.type === 'DECIMAL_LIQUIDATION') {
        totalQuantity += quantity  // Add fractional shares
        console.log(`  🔢 Decimal liquidation: +${quantity} shares`)
      } else {
        totalQuantity -= quantity  // Remove fractional shares
        console.log(`  🔢 Decimal withdrawal: -${quantity} shares`)
      }
    }
  }

  console.log(`📊 Final calculation for ${symbol}: ${totalQuantity} shares, cost: ${totalCost}`)

  if (totalQuantity > 0) {
    const avgPrice = totalCost / totalQuantity
    const isin = transactions[0]?.isin || null
    const currency = transactions[0]?.currency || 'NOK'

    await prisma.holding.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolioId,
          symbol: symbol
        }
      },
      update: {
        quantity: totalQuantity,
        avgPrice: avgPrice,
        isin: isin,
        currency: currency
      },
      create: {
        portfolioId: portfolioId,
        symbol: symbol,
        isin: isin,
        quantity: totalQuantity,
        avgPrice: avgPrice,
        currency: currency
      }
    })

    console.log(`✅ Updated holding: ${symbol} = ${totalQuantity} shares @ ${avgPrice.toFixed(4)} ${currency}`)
  } else {
    // Remove the holding if quantity is zero
    await prisma.holding.deleteMany({
      where: {
        portfolioId: portfolioId,
        symbol: symbol
      }
    })
    console.log(`🗑️ Removed holding: ${symbol} (zero quantity)`)
  }
}

// Recalculate all holdings for a portfolio
export async function recalculateAllHoldings(portfolioId: string): Promise<void> {
  console.log(`📊 Recalculating all holdings for portfolio: ${portfolioId}`)

  // Get all unique symbols in the portfolio (excluding cash symbols)
  const uniqueSymbols = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      NOT: {
        symbol: {
          startsWith: 'CASH_'
        }
      }
    },
    select: {
      symbol: true
    },
    distinct: ['symbol']
  })

  console.log(`📊 Found ${uniqueSymbols.length} unique securities to recalculate`)
  
  // Recalculate holdings for each security (no cash symbols)
  for (const { symbol } of uniqueSymbols) {
    console.log(`🔄 Recalculating holdings for: ${symbol}`)
    await updateSecurityHoldings(portfolioId, symbol)
  }

  console.log(`✅ Holdings recalculation completed`)
}

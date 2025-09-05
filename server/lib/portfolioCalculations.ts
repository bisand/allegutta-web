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

      // Special handling for EXCHANGE_IN transactions with nominal prices
      if (transaction.type === 'EXCHANGE_IN' && price <= 1.0 && transaction.notes?.includes('Fusjon')) {
        // For corporate actions/mergers with nominal prices, calculate from cost basis
        let estimatedExchangePrice = 0 // Will be calculated from the exchanged security

        // First, try to extract Kjøpsverdi from transaction notes (if imported from CSV)
        const kjøpsverdiMatch = transaction.notes?.match(/\[Kjøpsverdi:\s*([\d,.]+)\]/)
        let useKjøpsverdi = false
        if (kjøpsverdiMatch && quantity > 0) {
          const kjøpsverdi = parseFloat(kjøpsverdiMatch[1].replace(',', '.'))
          if (kjøpsverdi > 0) {
            // Kjøpsverdi represents the total historical cost basis being transferred
            totalCost += kjøpsverdi + fees  // Add the total cost basis plus any current fees
            useKjøpsverdi = true
            console.log(`  📊 Using imported Kjøpsverdi ${kjøpsverdi} + fees ${fees || 0} for ${quantity} shares`)
            console.log(`  💰 Total cost added: ${(kjøpsverdi + (fees || 0)).toFixed(4)} NOK`)
          }
        }

        // If no Kjøpsverdi available, calculate from the exchanged security cost basis
        if (!useKjøpsverdi) {
          const exchangeOutSymbol = transaction.notes?.match(/(\w+)\s+ger\s+\d+\s+(\w+)/)?.[1] // Extract "DNBH" from "Fusjon 1 DNBH ger 1 DNB"
          if (exchangeOutSymbol) {
            console.log(`  🔄 Calculating cost basis from exchanged security: ${exchangeOutSymbol}`)
            
            // Calculate the cost basis from the exchanged security at the time of exchange
            const exchangeOutTransactions = await prisma.transaction.findMany({
              where: {
                portfolioId: portfolioId,
                symbol: exchangeOutSymbol,
                type: {
                  in: ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'SPIN_OFF_IN']
                },
                date: {
                  lte: transaction.date
                }
              },
              orderBy: { date: 'asc' }
            })

            // Calculate the cost basis of the exchanged security at exchange time using FIFO
            let exchangedQuantity = 0
            let exchangedCost = 0

            for (const exchTrans of exchangeOutTransactions) {
              console.log(`    ${exchTrans.type}: ${exchTrans.quantity} @ ${exchTrans.price} (${exchTrans.date.toISOString().split('T')[0]})`)
              
              if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(exchTrans.type)) {
                exchangedQuantity += exchTrans.quantity
                exchangedCost += exchTrans.quantity * exchTrans.price + (exchTrans.fees || 0)
              } else if (['SELL', 'EXCHANGE_OUT'].includes(exchTrans.type)) {
                const sellQty = Math.min(exchTrans.quantity, exchangedQuantity)
                const avgPrice = exchangedQuantity > 0 ? exchangedCost / exchangedQuantity : 0
                exchangedQuantity -= sellQty
                exchangedCost -= sellQty * avgPrice
              }
              
              console.log(`    Running total: ${exchangedQuantity} shares, cost: ${exchangedCost.toFixed(2)}, avg: ${exchangedQuantity > 0 ? (exchangedCost / exchangedQuantity).toFixed(4) : 0}`)
            }

            // Calculate the average price from the exchanged security
            if (exchangedQuantity > 0 && exchangedCost > 0) {
              estimatedExchangePrice = exchangedCost / exchangedQuantity
              console.log(`  📊 Calculated exchange price from ${exchangeOutSymbol} cost basis: ${estimatedExchangePrice.toFixed(6)} NOK/share`)
              console.log(`  💰 Total cost basis transferred: ${exchangedCost.toFixed(2)} NOK for ${exchangedQuantity} shares`)
            } else {
              // Fallback if calculation fails
              estimatedExchangePrice = 100 // Conservative fallback
              console.log(`  ⚠️  Could not calculate cost basis from ${exchangeOutSymbol}, using fallback: ${estimatedExchangePrice}`)
            }
          } else {
            // No exchanged symbol found, use fallback
            estimatedExchangePrice = 100
            console.log(`  ⚠️  Could not identify exchanged security, using fallback: ${estimatedExchangePrice}`)
          }
        }

        // Add to total cost - either from Kjøpsverdi (already added above) or calculated exchange price
        if (!useKjøpsverdi) {
          totalCost += quantity * estimatedExchangePrice + fees
          console.log(`  ➕ ${transaction.type}: +${quantity} shares (merger/exchange, price ${estimatedExchangePrice.toFixed(4)})`)
        } else {
          console.log(`  ➕ ${transaction.type}: +${quantity} shares (merger/exchange, using Kjøpsverdi cost basis)`)
        }
      } else {
        totalCost += quantity * price + fees
        console.log(`  ➕ ${transaction.type}: +${quantity} shares`)
      }
    } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
      // These decrease holdings
      const sellQuantity = Math.min(quantity, totalQuantity)
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0

      totalQuantity -= sellQuantity
      totalCost -= sellQuantity * avgPrice
      totalCost = Math.max(0, totalCost) // Ensure non-negative
      console.log(`  ➖ ${transaction.type}: -${sellQuantity} shares`)
    } else if (['LIQUIDATION', 'REDEMPTION'].includes(transaction.type)) {
      // Corporate actions that liquidate entire position (like capital repayment)
      console.log(`  💰 ${transaction.type}: LIQUIDATING ${totalQuantity} shares (corporate action)`)
      totalQuantity = 0
      totalCost = 0
    } else if (['REFUND'].includes(transaction.type)) {
      // REFUND/TILBAKEBETALING is a cash payout that doesn't affect stock holdings
      // This should only affect cash balance, not stock quantity
      console.log(`  💰 ${transaction.type}: Cash payout of ${quantity * price} NOK (no change to stock holdings)`)
      // No change to totalQuantity or totalCost for stock holdings
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

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
  await prisma.portfolios.update({
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

  // Use standard calculation for all symbols
  await updateSecurityHoldingsStandard(portfolioId, symbol)
}

// Standard calculation method (renamed from original updateSecurityHoldings)
async function updateSecurityHoldingsStandard(portfolioId: string, symbol: string): Promise<void> {

  const transactions = await prisma.transactions.findMany({
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

  // FIFO lots: each buy (or incoming corporate action) creates a lot { qty, cost }
  const lots: Array<{ qty: number; cost: number }> = []

  for (const transaction of transactions) {
    const quantity = transaction.quantity
    const price = transaction.price ?? 0
    const fees = transaction.fees ?? 0

    if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(transaction.type)) {
      // Create a new lot for the incoming shares.
      let lotCost = 0

      console.log(`  🔍 Processing ${transaction.type} for ${symbol}: qty=${quantity}, price=${price}, fees=${fees}`)

      // Check for corporate actions that need special costBasis handling
      if ((transaction.type === 'EXCHANGE_IN' || transaction.type === 'SPIN_OFF_IN') && price <= 1.0 &&
        (transaction.notes?.includes('Fusjon') ||
          transaction.notes?.includes('ISINSKIFTE') ||
          transaction.notes?.includes('SPLEIS') ||
          transaction.notes?.includes('Splitt') ||
          transaction.notes?.includes('Change of ISIN') ||
          transaction.notes?.includes('BYTE AV EMITTENTLAND'))) {

        // Check for explicit costBasis field (imported Kjøpsverdi)
        const cb = (transaction as unknown as { costBasis?: number | null }).costBasis
        let usedKjopsverdi = false

        if (cb && cb > 0 && quantity > 0) {
          // costBasis may be either a total cost for the lot or a per-share value.
          // Heuristic: if costBasis is larger than a plausible per-share (price*qty*0.5), treat as total cost.
          if (cb >= price * quantity * 0.5) {
            lotCost = cb + fees
          } else {
            // treat cb as per-share
            lotCost = cb * quantity + fees
          }
          usedKjopsverdi = true
          console.log(`  📊 Using explicit costBasis ${cb} (lot total=${(lotCost - fees).toFixed(2)}) + fees ${fees} for ${quantity} shares`)
        }

        if (!usedKjopsverdi) {
          let estimatedExchangePrice = 0

          // Special handling for stock splits: look for LIQUIDATION on same date
          if (transaction.type === 'SPIN_OFF_IN' && transaction.notes?.includes('Splitt')) {
            console.log(`  📊 Detected stock split for ${symbol}, looking for LIQUIDATION on same date`)

            const liquidationTransaction = await prisma.transactions.findFirst({
              where: {
                portfolioId: portfolioId,
                symbol: symbol,
                type: 'LIQUIDATION',
                date: transaction.date
              }
            })

            if (liquidationTransaction) {
              console.log(`  📊 Found LIQUIDATION: ${liquidationTransaction.quantity} shares`)

              // Calculate cost basis from all transactions before the split
              const preSplitTransactions = await prisma.transactions.findMany({
                where: {
                  portfolioId: portfolioId,
                  symbol: symbol,
                  type: {
                    in: ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'SPIN_OFF_IN']
                  },
                  date: {
                    lt: transaction.date
                  }
                },
                orderBy: { date: 'asc' }
              })

              // Build FIFO lots up to the liquidation
              const preSplitLots: Array<{ qty: number; cost: number }> = []
              for (const pt of preSplitTransactions) {
                const ptQty = pt.quantity
                const ptPrice = pt.price ?? 0
                const ptFees = pt.fees ?? 0

                if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(pt.type)) {
                  preSplitLots.push({ qty: ptQty, cost: ptQty * ptPrice + ptFees })
                } else if (['SELL', 'EXCHANGE_OUT'].includes(pt.type)) {
                  let remainingSell = ptQty
                  while (remainingSell > 0 && preSplitLots.length > 0) {
                    const lot = preSplitLots[0]
                    const take = Math.min(remainingSell, lot.qty)
                    const costPerShare = lot.cost / lot.qty
                    lot.qty -= take
                    lot.cost -= costPerShare * take
                    remainingSell -= take
                    if (lot.qty === 0) preSplitLots.shift()
                  }
                }
              }

              const preSplitQuantity = preSplitLots.reduce((s, l) => s + l.qty, 0)
              const preSplitCost = preSplitLots.reduce((s, l) => s + l.cost, 0)

              if (preSplitQuantity > 0 && preSplitCost > 0) {
                const preSplitAvgPrice = preSplitCost / preSplitQuantity
                console.log(`  📊 Pre-split: ${preSplitQuantity} shares @ ${preSplitAvgPrice.toFixed(4)} NOK`)

                // For splits, the cost basis should be preserved but distributed across more shares
                estimatedExchangePrice = preSplitAvgPrice
                console.log(`  📊 Using pre-split cost basis: ${estimatedExchangePrice.toFixed(4)} NOK/share`)
                lotCost = quantity * estimatedExchangePrice + fees
              }
            }
          }

          // If still no cost basis found, use the original fallback logic
          if (estimatedExchangePrice === 0) {
            // Fallback: calculate estimated exchange price from related symbols
            // For corporate actions, we need to look at all related symbols that could contain the original cost basis

            // First, try to find the symbol mentioned in notes
            const exchangeOutSymbol = transaction.notes?.match(/(\w+)\s+ger\s+\d+\s+(\w+)/)?.[1]

            // Get the base symbol (remove suffixes like .NO, .OL, T-RETT, etc.)
            const baseSymbol = symbol.split(/[.\s-]/)[0]
            const symbolsToCheck = []

            if (exchangeOutSymbol) {
              symbolsToCheck.push(exchangeOutSymbol)
            }

            // Add variations of the current symbol to check for cost basis
            symbolsToCheck.push(
              `${baseSymbol}.NO`,     // Old Norwegian format
              `${baseSymbol}.OL`,     // Current Norwegian format  
              baseSymbol,             // Base symbol
              `AXA.NO`,              // Special case for AXACTOR
              `AXA.NO.OLD/X`         // Special case for old AXACTOR
            )

            console.log(`  🔄 Searching for cost basis in related symbols: ${symbolsToCheck.join(', ')}`)

            for (const searchSymbol of symbolsToCheck) {
              const exchangeOutTransactions = await prisma.transactions.findMany({
                where: {
                  portfolioId: portfolioId,
                  symbol: {
                    startsWith: searchSymbol.split(/[.\s-]/)[0] // Use base symbol for LIKE pattern
                  },
                  type: {
                    in: ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'SPIN_OFF_IN']
                  },
                  date: {
                    lte: transaction.date
                  }
                },
                orderBy: { date: 'asc' }
              })

              // Build FIFO lots for the related security and compute remaining avg price
              const exchLots: Array<{ qty: number; cost: number }> = []
              for (const et of exchangeOutTransactions) {
                const etQty = et.quantity
                const etPrice = et.price ?? 0
                const etFees = et.fees ?? 0

                if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(et.type)) {
                  exchLots.push({ qty: etQty, cost: etQty * etPrice + etFees })
                } else if (['SELL', 'EXCHANGE_OUT'].includes(et.type)) {
                  let remainingSell = etQty
                  while (remainingSell > 0 && exchLots.length > 0) {
                    const lot = exchLots[0]
                    const take = Math.min(remainingSell, lot.qty)
                    const costPerShare = lot.cost / lot.qty
                    lot.qty -= take
                    lot.cost -= costPerShare * take
                    remainingSell -= take
                    if (lot.qty === 0) exchLots.shift()
                  }
                }
              }

              // sum remaining exchLots
              const exchangedQuantity = exchLots.reduce((s, l) => s + l.qty, 0)
              const exchangedCost = exchLots.reduce((s, l) => s + l.cost, 0)
              if (exchangedQuantity > 0 && exchangedCost > 0) {
                estimatedExchangePrice = exchangedCost / exchangedQuantity
                console.log(`  📊 Found cost basis from ${searchSymbol}: ${estimatedExchangePrice.toFixed(6)} NOK/share`)
                break // Found cost basis, stop searching
              }
            }

            if (estimatedExchangePrice === 0) {
              estimatedExchangePrice = 100
              console.log(`  ⚠️  Could not find cost basis in any related symbols, using fallback: ${estimatedExchangePrice}`)
            }

            lotCost = quantity * estimatedExchangePrice + fees
          }
        }
      } else {
        // Normal buy/spin-off - simple cost calculation
        lotCost = quantity * price + fees
        console.log(`  📊 Simple cost calculation: ${quantity} × ${price} + ${fees} = ${lotCost.toFixed(2)}`)
      }

      lots.push({ qty: quantity, cost: lotCost })
      console.log(`  ➕ ${transaction.type}: +${quantity} shares (lot cost ${lotCost.toFixed(2)})`)
    } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
      // Consume lots FIFO
      let remaining = quantity
      let soldTotal = 0
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0]
        const take = Math.min(remaining, lot.qty)
        const costPerShare = lot.cost / lot.qty
        const costRemoved = costPerShare * take

        lot.qty -= take
        lot.cost -= costRemoved
        soldTotal += costRemoved
        remaining -= take

        if (lot.qty === 0) lots.shift()
      }

      // NOTE: SELL fees should NOT be allocated to remaining holdings in FIFO accounting
      // They reduce the proceeds from the sale, but don't affect the cost basis of remaining shares

      if (remaining > 0) {
        // Selling more than available: log and clamp (no negative lots)
        console.log(`  ⚠️ Sell exceeds available FIFO lots by ${remaining} shares — clamped to zero`)
      }

      console.log(`  ➖ ${transaction.type}: -${quantity - remaining} shares (removed cost ${soldTotal.toFixed(2)})`)
    } else if (['LIQUIDATION', 'REDEMPTION'].includes(transaction.type)) {
      // Remove all lots (corporate action that ends position)
      console.log(`  💰 ${transaction.type}: LIQUIDATING all lots`)
      lots.length = 0
    } else if (['REFUND'].includes(transaction.type)) {
      // Check if this is a capital return that should reduce cost basis
      if (transaction.notes?.includes('tilbakebetaling av innbetalt kapital') ||
        transaction.notes?.includes('Kapitalutbetaling') ||
        transaction.notes?.includes('return of capital')) {

        // This is a return of capital - reduce cost basis proportionally
        const refundPerShare = (quantity * price) // Total refund amount
        const totalShares = lots.reduce((s, l) => s + l.qty, 0)

        if (totalShares > 0 && refundPerShare > 0) {
          const costReductionPerShare = refundPerShare / totalShares
          let totalCostReduction = 0

          for (const lot of lots) {
            const reduction = lot.qty * costReductionPerShare
            lot.cost = Math.max(0, lot.cost - reduction) // Don't go negative
            totalCostReduction += reduction
          }

          console.log(`  💰 ${transaction.type}: Capital return of ${refundPerShare.toFixed(2)} reduced cost basis by ${costReductionPerShare.toFixed(6)}/share (total: ${totalCostReduction.toFixed(2)})`)
        }
      } else {
        console.log(`  💰 ${transaction.type}: cash-only event, no change to lots`)
      }
    } else if (['DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
      if (transaction.type === 'DECIMAL_LIQUIDATION') {
        // Add a small fractional lot; price used as provided
        const calculatedCost = quantity * price + fees
        lots.push({ qty: quantity, cost: calculatedCost })
        console.log(`  🔢 Decimal liquidation: +${quantity} shares (cost: ${calculatedCost.toFixed(2)})`)
      } else {
        // Remove fractional shares FIFO
        let remaining = quantity
        while (remaining > 0 && lots.length > 0) {
          const lot = lots[0]
          const take = Math.min(remaining, lot.qty)
          const costPerShare = lot.cost / lot.qty
          lot.qty -= take
          lot.cost -= costPerShare * take
          remaining -= take
          if (lot.qty === 0) lots.shift()
        }
        console.log(`  🔢 Decimal withdrawal: -${quantity} shares`)
      }
    }
  }

  // Recompute totals from remaining lots
  const totalQuantity = Math.max(0, Math.round(lots.reduce((s, l) => s + l.qty, 0) * 1000000) / 1000000) // guard rounding
  const totalCost = Math.max(0, lots.reduce((s, l) => s + l.cost, 0))

  console.log(`📊 Final calculation for ${symbol}: ${totalQuantity} shares, cost: ${totalCost.toFixed(2)}`)

  if (totalQuantity > 0) {
    const calculatedAvgPrice = totalCost / totalQuantity
    const isin = transactions[0]?.isin || null
    const currency = transactions[0]?.currency || 'NOK'

    // Check if there's an existing holding with manual GAV override
    const existingHolding = await prisma.holdings.findUnique({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolioId,
          symbol: symbol
        }
      },
      select: {
        useManualAvgPrice: true,
        manualAvgPrice: true,
        manualAvgPriceReason: true,
        manualAvgPriceDate: true
      }
    })

    // Preserve manual GAV if it exists and is active
    const shouldUseManualGav = existingHolding?.useManualAvgPrice && existingHolding?.manualAvgPrice != null
    const finalAvgPrice = shouldUseManualGav ? existingHolding.manualAvgPrice! : calculatedAvgPrice

    if (shouldUseManualGav) {
      console.log(`📌 Using manual GAV for ${symbol}: ${finalAvgPrice.toFixed(4)} (calculated: ${calculatedAvgPrice.toFixed(4)})`)
    }

    await prisma.holdings.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolioId,
          symbol: symbol
        }
      },
      update: {
        quantity: totalQuantity,
        avgPrice: finalAvgPrice,
        isin: isin,
        currency: currency,
        updatedAt: new Date()
        // Preserve existing manual GAV fields - don't overwrite them
      },
      create: {
        id: `${portfolioId}_${symbol}`,
        portfolioId: portfolioId,
        symbol: symbol,
        isin: isin,
        quantity: totalQuantity,
        avgPrice: finalAvgPrice,
        currency: currency,
        useManualAvgPrice: false,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Updated holding: ${symbol} = ${totalQuantity} shares @ ${finalAvgPrice.toFixed(4)} ${currency}`)
  } else {
    // Remove the holding if quantity is zero
    await prisma.holdings.deleteMany({
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
  const uniqueSymbols = await prisma.transactions.findMany({
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

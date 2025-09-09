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

      if (transaction.type === 'EXCHANGE_IN' && price <= 1.0 && transaction.notes?.includes('Fusjon')) {
        // Prefer explicit costBasis field when available (imported Kjøpsverdi)
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
          // Fallback: calculate estimated exchange price from the outgoing security cost basis
          const exchangeOutSymbol = transaction.notes?.match(/(\w+)\s+ger\s+\d+\s+(\w+)/)?.[1]
          let estimatedExchangePrice = 0

          if (exchangeOutSymbol) {
            console.log(`  🔄 Calculating cost basis from exchanged security: ${exchangeOutSymbol}`)
            const exchangeOutTransactions = await prisma.transactions.findMany({
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

            // Build FIFO lots for the exchanged security and compute remaining avg price
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
              console.log(`  📊 Calculated exchange price from ${exchangeOutSymbol}: ${estimatedExchangePrice.toFixed(6)} NOK/share`)
            } else {
              estimatedExchangePrice = 100
              console.log(`  ⚠️  Could not calculate cost basis from ${exchangeOutSymbol}, using fallback: ${estimatedExchangePrice}`)
            }
          } else {
            estimatedExchangePrice = 100
            console.log(`  ⚠️  Could not identify exchanged security, using fallback: ${estimatedExchangePrice}`)
          }

          lotCost = quantity * estimatedExchangePrice + fees
        }
      } else {
        // Normal buy/spin-off
        lotCost = quantity * price + fees
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

      // Allocate sell fees proportionally to remaining shares
      if (fees > 0 && lots.length > 0) {
        const totalRemainingShares = lots.reduce((s, l) => s + l.qty, 0)
        if (totalRemainingShares > 0) {
          const feePerShare = fees / totalRemainingShares
          for (const lot of lots) {
            lot.cost += lot.qty * feePerShare
          }
          console.log(`  💰 Allocated sell fees ${fees.toFixed(2)} to ${totalRemainingShares} remaining shares (${feePerShare.toFixed(4)}/share)`)
        }
      }

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
      console.log(`  💰 ${transaction.type}: cash-only event, no change to lots`)
    } else if (['DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
      if (transaction.type === 'DECIMAL_LIQUIDATION') {
        // Add a small fractional lot; price used as provided
        const lotCost = quantity * price + fees
        lots.push({ qty: quantity, cost: lotCost })
        console.log(`  🔢 Decimal liquidation: +${quantity} shares (lot cost ${lotCost.toFixed(2)})`)
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
    const avgPrice = totalCost / totalQuantity
    const isin = transactions[0]?.isin || null
    const currency = transactions[0]?.currency || 'NOK'

    await prisma.holdings.upsert({
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
        currency: currency,
        updatedAt: new Date()
      },
      create: {
        id: `${portfolioId}_${symbol}`,
        portfolioId: portfolioId,
        symbol: symbol,
        isin: isin,
        quantity: totalQuantity,
        avgPrice: avgPrice,
        currency: currency,
        updatedAt: new Date()
      }
    })

    console.log(`✅ Updated holding: ${symbol} = ${totalQuantity} shares @ ${avgPrice.toFixed(4)} ${currency}`)
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

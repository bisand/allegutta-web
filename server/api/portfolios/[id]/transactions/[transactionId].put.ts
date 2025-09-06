import prisma from '../../../../lib/prisma'
import { requireAuth } from '../../../../lib/auth'

// PUT /api/portfolios/[id]/transactions/[transactionId] - Update transaction
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'PUT') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await requireAuth(event)
  const portfolioId = getRouterParam(event, 'id')
  const transactionId = getRouterParam(event, 'transactionId')
  const body = await readBody(event)

  if (!portfolioId || !transactionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio ID and Transaction ID are required'
    })
  }

  try {
    // Verify portfolio belongs to user
    const portfolio = await prisma.portfolios.findFirst({
      where: {
        id: portfolioId,
        userId: user.id
      }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    // Verify transaction belongs to this portfolio
    const existingTransaction = await prisma.transactions.findFirst({
      where: {
        id: transactionId,
        portfolioId: portfolioId
      }
    })

    if (!existingTransaction) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Transaction not found'
      })
    }

    // Update transaction
    const transaction = await prisma.transactions.update({
      where: {
        id: transactionId
      },
      data: {
        symbol: body.symbol?.toUpperCase(),
        type: body.type,
        quantity: body.quantity ? parseFloat(body.quantity.toString()) : undefined,
        price: body.price ? parseFloat(body.price.toString()) : undefined,
        fees: body.fees !== undefined ? parseFloat(body.fees.toString()) : undefined,
        currency: body.currency || portfolio.currency || 'NOK',
        date: body.date ? new Date(body.date) : undefined,
        notes: body.notes,
        saldo: body.saldo ? parseFloat(body.saldo.toString()) : undefined  // Update saldo if provided
      }
    })

    // Recalculate holdings for the old symbol (if changed) - securities only
    if (body.symbol && existingTransaction.symbol !== body.symbol.toUpperCase()) {
      if (!existingTransaction.symbol.startsWith('CASH_')) {
        await updateSecurityHoldings(portfolioId, existingTransaction.symbol)
      }
    }

    // Recalculate holdings for the current symbol - securities only
    if (!transaction.symbol.startsWith('CASH_')) {
      await updateSecurityHoldings(portfolioId, transaction.symbol)
    }

    // Always recalculate cash balance after any transaction
    await updateCashBalance(portfolioId)

    return {
      data: transaction
    }
  } catch (error) {
    console.error('Error updating transaction:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update transaction'
    })
  }
})

// Calculate and update the cash balance for a portfolio
async function updateCashBalance(portfolioId: string): Promise<void> {
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
async function updateSecurityHoldings(portfolioId: string, symbol: string): Promise<void> {
  // Skip cash symbols - they're handled by updateCashBalance
  if (symbol.startsWith('CASH_')) {
    return
  }
  
  console.log(`📊 Recalculating security holdings for: ${symbol}`)
  
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
        currency: currency
      },
      create: {
        id: `hold-${portfolioId}-${symbol}`, // Unique ID for holding
        portfolioId: portfolioId,
        symbol: symbol,
        isin: isin,
        quantity: totalQuantity,
        avgPrice: avgPrice,
        currency: currency,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    console.log(`✅ Updated ${symbol} holding: ${totalQuantity} shares @ ${avgPrice.toFixed(2)}`)
  } else {
    // Remove holding if quantity is 0
    await prisma.holdings.deleteMany({
      where: {
        portfolioId: portfolioId,
        symbol: symbol
      }
    })
    console.log(`❌ Removed ${symbol} holding (quantity is 0)`)
  }
}

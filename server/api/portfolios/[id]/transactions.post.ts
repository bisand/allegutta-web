import prisma from '../../../lib/prisma'

// POST /api/portfolios/[id]/transactions - Add new transaction
export default defineEventHandler(async (event) => {

  const user = await event.context.kinde.getUser()
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const portfolioId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!portfolioId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Portfolio ID is required'
    })
  }

  // Validate input
  if (!body.symbol || !body.type || !body.quantity || !body.price || !body.date) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields'
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

    // Try to get ISIN from existing market data records
    let isin: string | null = body.isin || null
    if (!isin) {
      const marketData = await prisma.market_data.findFirst({
        where: { symbol: body.symbol.toUpperCase() }
      })
      isin = marketData?.isin || null
    }

    if (!isin) {
      // Return error if ISIN is still not found
      throw createError({
        statusCode: 400,
        statusMessage: 'ISIN is required for securities transactions'
      })
    }

    // Get the previous saldo (running balance) from the last transaction
    const lastTransaction = await prisma.transactions.findFirst({
      where: {
        portfolioId: portfolioId
      },
      orderBy: {
        date: 'desc'
      }
    })

    const previousSaldo = lastTransaction?.saldo || 0
    const baseAmount = parseFloat(body.amount) || (parseFloat(body.quantity) * parseFloat(body.price)) + (parseFloat(body.fees) || 0)
    
    // Determine cash impact based on transaction type
    let transactionAmount = baseAmount
    const transactionType = body.type as string
    
    // Transaction types that subtract cash (negative impact)
    const cashOutTypes = ['BUY', 'WITHDRAWAL', 'EXCHANGE_OUT', 'INTEREST_CHARGE', 'DECIMAL_WITHDRAWAL']
    // Transaction types that add cash (positive impact)
    const cashInTypes = ['SELL', 'DIVIDEND', 'DEPOSIT', 'EXCHANGE_IN', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'SPIN_OFF_IN', 'DECIMAL_LIQUIDATION', 'DIVIDEND_REINVEST', 'RIGHTS_ALLOCATION', 'TRANSFER_IN', 'SALDO_ADJUSTMENT']
    
    if (cashOutTypes.includes(transactionType)) {
      transactionAmount = -Math.abs(baseAmount) // Ensure negative for cash out
    } else if (cashInTypes.includes(transactionType)) {
      transactionAmount = Math.abs(baseAmount) // Ensure positive for cash in
    }
    // For other types like SPLIT, MERGER, RIGHTS_ISSUE, keep the amount as provided
    
    const newSaldo = previousSaldo + transactionAmount

    // Create transaction
    const transaction = await prisma.transactions.create({
      data: {
        id: `txn-${portfolioId}-${Date.now()}`, // Unique ID for transaction
        portfolioId: portfolioId,
        symbol: body.symbol.toUpperCase(),
        isin: isin,
        type: body.type,
        quantity: parseFloat(body.quantity),
        price: parseFloat(body.price),
        fees: parseFloat(body.fees) || 0,
        amount: transactionAmount,
        currency: body.currency || portfolio.currency || 'NOK',
        date: new Date(body.date),
        notes: body.notes || null,
        saldo: newSaldo,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Update holdings for the transaction symbol (securities only)
    if (!body.symbol.toUpperCase().startsWith('CASH_')) {
      await updateSecurityHoldings(portfolioId, body.symbol.toUpperCase())
    }
    
    // Always recalculate cash balance after any transaction
    await updateCashBalance(portfolioId)

    return {
      success: true,
      data: transaction
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create transaction'
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

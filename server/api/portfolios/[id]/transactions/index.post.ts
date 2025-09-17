import prisma from '../../../../lib/prisma'
import { getRequiredAuth } from '../../../../lib/auth'
import { updateCashBalance, updateSecurityHoldings } from '../../../../lib/portfolioCalculations'

// POST /api/portfolios/[id]/transactions - Add new transaction
export default defineEventHandler(async (event) => {

  const { dbUser } = await getRequiredAuth(event)

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
        userId: dbUser.id // Use database user ID
      }
    })

    if (!portfolio) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Portfolio not found'
      })
    }

    // Try to get ISIN from existing market data records (not needed for cash transactions)
    let isin: string | null = body.isin || null
    const isSymbolCash = body.symbol.toUpperCase() === 'CASH'
    
    if (!isin && !isSymbolCash) {
      const marketData = await prisma.market_data.findFirst({
        where: { symbol: body.symbol.toUpperCase() }
      })
      isin = marketData?.isin || null
    }

    if (!isin && !isSymbolCash) {
      // Return error if ISIN is still not found for securities (not cash)
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
    if (body.symbol.toUpperCase() !== 'CASH') {
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

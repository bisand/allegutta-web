import prisma from '../../../../lib/prisma'
import { getRequiredAuth } from '../../../../lib/auth'
import { updateCashBalance, updateSecurityHoldings } from '../../../../lib/portfolioCalculations'

// PUT /api/portfolios/[id]/transactions/[transactionId] - Update transaction
export default defineEventHandler(async (event) => {
  const { dbUser } = await getRequiredAuth(event)

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
        userId: dbUser.id // Use database user ID
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

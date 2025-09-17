import prisma from '../../../../lib/prisma'
import { getRequiredAuth } from '../../../../lib/auth'
import { updateCashBalance, updateSecurityHoldings } from '../../../../lib/portfolioCalculations'

// DELETE /api/portfolios/[id]/transactions/[transactionId] - Delete a transaction
export default defineEventHandler(async (event) => {
  const { dbUser } = await getRequiredAuth(event)

  const portfolioId = getRouterParam(event, 'id')
  const transactionId = getRouterParam(event, 'transactionId')

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
    const transaction = await prisma.transactions.findFirst({
      where: {
        id: transactionId,
        portfolioId: portfolioId
      }
    })

    if (!transaction) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Transaction not found'
      })
    }

    // Delete the transaction
    await prisma.transactions.delete({
      where: {
        id: transactionId
      }
    })

    // Recalculate holdings for the affected symbol
    if (transaction.symbol !== 'CASH') {
      await updateSecurityHoldings(portfolioId, transaction.symbol)
    }

    // Always recalculate cash balance after any transaction
    await updateCashBalance(portfolioId)

    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete transaction'
    })
  }
})

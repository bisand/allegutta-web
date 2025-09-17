import prisma from '../../../../lib/prisma'
import { getRequiredAuth } from '../../../../lib/auth'
import { updateCashBalance } from '../../../../lib/portfolioCalculations'

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
    if (!transaction.symbol.startsWith('CASH_')) {
      await recalculateHoldings(portfolioId, transaction.symbol)
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

// Helper function to recalculate holdings after transaction deletion
async function recalculateHoldings(portfolioId: string, symbol: string) {
  // Skip cash symbols - they're handled by updateCashBalance
  if (symbol.startsWith('CASH_')) {
    return
  }

  // Handle non-cash holdings (stocks, bonds, etc.)
  // Get all transactions for this symbol in this portfolio
  const transactions = await prisma.transactions.findMany({
    where: {
      portfolioId,
      symbol
    },
    orderBy: {
      date: 'asc'
    }
  })

  let totalQuantity = 0
  let totalCostBasis = 0

  // Calculate totals from all transactions
  for (const transaction of transactions) {
    if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN', 'DIVIDEND_REINVEST', 'RIGHTS_ALLOCATION', 'RIGHTS_ISSUE'].includes(transaction.type)) {
      totalQuantity += transaction.quantity
      // Use the more accurate 'amount' field when available, otherwise calculate
      const amount = transaction.amount ?? (transaction.quantity * transaction.price)
      totalCostBasis += amount + (transaction.fees || 0)
    } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
      totalQuantity -= transaction.quantity
      // For sells, we reduce cost basis proportionally
      if (totalQuantity > 0) {
        const sellRatio = transaction.quantity / (totalQuantity + transaction.quantity)
        totalCostBasis *= (1 - sellRatio)
      }
    } else if (['REFUND', 'LIQUIDATION', 'REDEMPTION'].includes(transaction.type)) {
      // Corporate actions that liquidate entire position
      console.log(`💰 Corporate action ${transaction.type} for ${symbol}: liquidating ${totalQuantity} shares`)
      totalQuantity = 0
      totalCostBasis = 0
    }
    // Handle other transaction types as needed
  }

  if (totalQuantity > 0) {
    const avgPrice = totalCostBasis / totalQuantity

    // Get currency from the latest transaction for this symbol
    const latestTransactionWithCurrency = await prisma.transactions.findFirst({
      where: {
        portfolioId,
        symbol
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        currency: true
      }
    })
    const currency = latestTransactionWithCurrency?.currency || 'NOK'

    // Update or create holding
    await prisma.holdings.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol
        }
      },
      update: {
        quantity: totalQuantity,
        avgPrice,
        currency: currency
      },
      create: {
        id: portfolioId,
        portfolioId,
        symbol,
        quantity: totalQuantity,
        avgPrice,
        currency: currency,
        updatedAt: new Date()
      }
    })
  } else {
    // Remove holding if quantity is 0
    await prisma.holdings.deleteMany({
      where: {
        portfolioId,
        symbol
      }
    })
  }
}

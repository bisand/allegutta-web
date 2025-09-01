import prisma from '../../../../lib/prisma'
import { requireAuth } from '../../../../lib/auth'

// DELETE /api/portfolios/[id]/transactions/[transactionId] - Delete a transaction
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'DELETE') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await requireAuth(event)
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
    const portfolio = await prisma.portfolio.findFirst({
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
    const transaction = await prisma.transaction.findFirst({
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
    await prisma.transaction.delete({
      where: {
        id: transactionId
      }
    })

    // Recalculate holdings for the affected symbol
    await recalculateHoldings(portfolioId, transaction.symbol)

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
  // Get all transactions for this symbol in this portfolio
  const transactions = await prisma.transaction.findMany({
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
    if (transaction.type === 'BUY') {
      totalQuantity += transaction.quantity
      totalCostBasis += (transaction.quantity * transaction.price) + (transaction.fees || 0)
    } else if (transaction.type === 'SELL') {
      totalQuantity -= transaction.quantity
      // For sells, we reduce cost basis proportionally
      if (totalQuantity > 0) {
        const sellRatio = transaction.quantity / (totalQuantity + transaction.quantity)
        totalCostBasis *= (1 - sellRatio)
      }
    }
    // Handle other transaction types as needed
  }

  if (totalQuantity > 0) {
    const avgPrice = totalCostBasis / totalQuantity

    // Update or create holding
    await prisma.holding.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol
        }
      },
      update: {
        quantity: totalQuantity,
        avgPrice,
        lastUpdated: new Date()
      },
      create: {
        portfolioId,
        symbol,
        quantity: totalQuantity,
        avgPrice,
        lastUpdated: new Date()
      }
    })
  } else {
    // Remove holding if quantity is 0
    await prisma.holding.deleteMany({
      where: {
        portfolioId,
        symbol
      }
    })
  }
}

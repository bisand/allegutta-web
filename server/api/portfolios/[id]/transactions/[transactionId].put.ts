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
    const existingTransaction = await prisma.transaction.findFirst({
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
    const transaction = await prisma.transaction.update({
      where: {
        id: transactionId
      },
      data: {
        symbol: body.symbol?.toUpperCase(),
        type: body.type,
        quantity: body.quantity ? parseFloat(body.quantity.toString()) : undefined,
        price: body.price ? parseFloat(body.price.toString()) : undefined,
        fees: body.fees !== undefined ? parseFloat(body.fees.toString()) : undefined,
        date: body.date ? new Date(body.date) : undefined,
        notes: body.notes
      }
    })

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

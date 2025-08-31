import prisma from '../../../lib/prisma'
import { requireAuth } from '../../../lib/auth'

// POST /api/portfolios/[id]/transactions - Add new transaction
export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    })
  }

  const user = await requireAuth(event)
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

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        portfolioId: portfolioId,
        symbol: body.symbol.toUpperCase(),
        type: body.type,
        quantity: parseFloat(body.quantity),
        price: parseFloat(body.price),
        fees: parseFloat(body.fees) || 0,
        date: new Date(body.date),
        notes: body.notes || null
      }
    })

    // Update holdings
    await updateHoldings(portfolioId, body.symbol.toUpperCase())

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

// Helper function to update holdings based on transactions
async function updateHoldings(portfolioId: string, symbol: string): Promise<void> {
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      symbol: symbol
    },
    orderBy: {
      date: 'asc'
    }
  })

  let totalQuantity = 0
  let totalCost = 0

  for (const transaction of transactions) {
    if (transaction.type === 'BUY') {
      totalQuantity += transaction.quantity
      totalCost += transaction.quantity * transaction.price + transaction.fees
    } else if (transaction.type === 'SELL') {
      const sellQuantity = Math.min(transaction.quantity, totalQuantity)
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
      
      totalQuantity -= sellQuantity
      totalCost -= sellQuantity * avgPrice
      totalCost = Math.max(0, totalCost) // Ensure non-negative
    }
    // Handle other transaction types (DIVIDEND, SPLIT, MERGER) as needed
  }

  if (totalQuantity > 0) {
    const avgPrice = totalCost / totalQuantity

    await prisma.holding.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId: portfolioId,
          symbol: symbol
        }
      },
      update: {
        quantity: totalQuantity,
        avgPrice: avgPrice,
        lastUpdated: new Date()
      },
      create: {
        portfolioId: portfolioId,
        symbol: symbol,
        quantity: totalQuantity,
        avgPrice: avgPrice
      }
    })
  } else {
    // Remove holding if quantity is 0
    await prisma.holding.deleteMany({
      where: {
        portfolioId: portfolioId,
        symbol: symbol
      }
    })
  }
}

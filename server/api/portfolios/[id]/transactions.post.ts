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
        currency: body.currency || portfolio.currency || 'NOK',
        date: new Date(body.date),
        notes: body.notes || null
      }
    })

    // Update holdings for the transaction symbol
    await updateHoldings(portfolioId, body.symbol.toUpperCase())
    
    // For ALL transactions (except direct cash transactions), update cash holdings
    // Cash impact should mirror how the Norwegian broker calculates saldo changes
    if (!body.symbol.toUpperCase().startsWith('CASH_')) {
      await updateCashAfterTransaction(portfolioId, {
        type: body.type,
        symbol: body.symbol.toUpperCase(),
        quantity: parseFloat(body.quantity),
        price: parseFloat(body.price),
        fees: parseFloat(body.fees) || 0,
        currency: body.currency || portfolio.currency || 'NOK'
      }, portfolio.currency || 'NOK')
    }

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

// Function to update cash holdings after a transaction (mimicking Norwegian broker logic)
async function updateCashAfterTransaction(
  portfolioId: string, 
  transaction: {
    type: string,
    symbol: string,
    quantity: number,
    price: number,
    fees: number,
    currency: string
  },
  portfolioCurrency: string
): Promise<void> {
  const cashSymbol = `CASH_${portfolioCurrency}`
  
  // Get current cash balance
  const currentCashHolding = await prisma.holding.findUnique({
    where: {
      portfolioId_symbol: {
        portfolioId,
        symbol: cashSymbol
      }
    }
  })
  
  const currentCash = currentCashHolding?.quantity || 0
  let cashImpact = 0
  
  // Calculate cash impact based on transaction type (following Norwegian broker logic)
  const amount = transaction.quantity * transaction.price
  const fees = transaction.fees
  
  switch (transaction.type) {
    case 'BUY':
    case 'RIGHTS_ALLOCATION':
    case 'RIGHTS_ISSUE':
      // Buying securities decreases cash (amount + fees)
      cashImpact = -(amount + fees)
      break
      
    case 'SELL':
      // Selling securities increases cash (amount) but fees are always subtracted
      cashImpact = amount - fees
      break
      
    case 'DIVIDEND':
    case 'DIVIDEND_REINVEST':
      // Dividends increase cash, fees (if any) are subtracted
      cashImpact = amount - fees
      break
      
    case 'DEPOSIT':
    case 'REFUND':
    case 'LIQUIDATION':
    case 'REDEMPTION':
    case 'DECIMAL_LIQUIDATION':
    case 'SPIN_OFF_IN':
    case 'TRANSFER_IN':
      // These increase cash, fees (if any) are subtracted
      cashImpact = amount - fees
      break
      
    case 'WITHDRAWAL':
    case 'DECIMAL_WITHDRAWAL':
    case 'INTEREST_CHARGE':
      // These decrease cash, fees make it worse
      cashImpact = -(amount + fees)
      break
      
    case 'EXCHANGE_IN':
      // Exchange in increases cash, fees are subtracted
      cashImpact = amount - fees
      break
      
    case 'EXCHANGE_OUT':
      // Exchange out decreases cash, fees make it worse
      cashImpact = -(amount + fees)
      break
      
    case 'SPLIT':
    case 'MERGER':
      // These typically don't affect cash directly, but fees (if any) are subtracted
      cashImpact = -fees
      break
      
    default:
      // Unknown transaction types: only subtract fees if any
      cashImpact = -fees
      break
  }
  
  // Update cash holdings with new balance
  const newCashBalance = currentCash + cashImpact
  
  if (newCashBalance !== 0 || currentCashHolding) {
    await prisma.holding.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol: cashSymbol
        }
      },
      update: {
        quantity: newCashBalance,
        avgPrice: 1.0,
        currency: portfolioCurrency,
        lastUpdated: new Date()
      },
      create: {
        portfolioId,
        symbol: cashSymbol,
        quantity: newCashBalance,
        avgPrice: 1.0,
        currency: portfolioCurrency
      }
    })
    
    console.log(`💰 Cash impact for ${transaction.type}: ${cashImpact} ${portfolioCurrency} (new balance: ${newCashBalance})`)
  }
}

// Helper function to update holdings based on transactions
async function updateHoldings(portfolioId: string, symbol: string): Promise<void> {
  if (symbol.startsWith('CASH_')) {
    // Handle cash holdings - sum all transactions that affect cash balance
    // This includes direct cash transactions AND the impact of stock transactions
    
    // 1. Get direct cash transactions for this specific cash symbol
    const directCashTransactions = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolioId,
        symbol: symbol,
        type: {
          in: [
            'DEPOSIT', 'WITHDRAWAL', 'REFUND',           // Direct cash transactions
            'DIVIDEND', 'DIVIDEND_REINVEST',             // Dividends increase cash
            'LIQUIDATION', 'REDEMPTION',                 // Liquidations increase cash
            'DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL', // Decimal adjustments
            'SPIN_OFF_IN',                              // Spin-offs can create cash
            'TRANSFER_IN', 'INTEREST_CHARGE',           // Transfers and interest
            'RIGHTS_ISSUE'                              // Rights issues
          ]
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // 2. Get all stock transactions that affect cash (since there are no automatic cash transactions)
    const stockTransactions = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolioId,
        NOT: {
          symbol: {
            startsWith: 'CASH_'
          }
        },
        type: {
          in: ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'RIGHTS_ALLOCATION', 'RIGHTS_ISSUE']
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    let totalCash = 0
    
    // Process direct cash transactions
    for (const transaction of directCashTransactions) {
      const amount = transaction.quantity * transaction.price
      
      if (['DEPOSIT', 'DIVIDEND', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'DECIMAL_LIQUIDATION', 'SPIN_OFF_IN', 'DIVIDEND_REINVEST', 'TRANSFER_IN', 'RIGHTS_ISSUE'].includes(transaction.type)) {
        totalCash += amount  // These increase cash
      } else if (['WITHDRAWAL', 'DECIMAL_WITHDRAWAL', 'INTEREST_CHARGE'].includes(transaction.type)) {
        totalCash -= amount  // These decrease cash
      }
    }
    
    // Process stock transactions that affect cash (no automatic cash transactions exist)
    for (const transaction of stockTransactions) {
      const amount = transaction.quantity * transaction.price
      const fees = transaction.fees || 0
      
      if (['BUY', 'EXCHANGE_IN', 'RIGHTS_ALLOCATION', 'RIGHTS_ISSUE'].includes(transaction.type)) {
        totalCash -= (amount + fees)  // Buying stocks decreases cash (including fees)
      } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
        totalCash += (amount - fees)  // Selling stocks increases cash (minus fees)
      }
    }

    if (totalCash !== 0) {
      // Extract currency from CASH symbol (e.g., CASH_NOK -> NOK)
      const currency = symbol.startsWith('CASH_') ? symbol.substring(5) : 'NOK'
      
      await prisma.holding.upsert({
        where: {
          portfolioId_symbol: {
            portfolioId: portfolioId,
            symbol: symbol
          }
        },
        update: {
          quantity: totalCash,
          avgPrice: 1.0,
          currency: currency,
          lastUpdated: new Date()
        },
        create: {
          portfolioId: portfolioId,
          symbol: symbol,
          quantity: totalCash,
          avgPrice: 1.0,
          currency: currency
        }
      })
    } else {
      // Remove cash holding if balance is 0
      await prisma.holding.deleteMany({
        where: {
          portfolioId: portfolioId,
          symbol: symbol
        }
      })
    }
    return
  }

  // Handle non-cash holdings (stocks, bonds, etc.)
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
    if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(transaction.type)) {
      totalQuantity += transaction.quantity
      totalCost += transaction.quantity * transaction.price + transaction.fees
    } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
      const sellQuantity = Math.min(transaction.quantity, totalQuantity)
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
      
      totalQuantity -= sellQuantity
      totalCost -= sellQuantity * avgPrice
      totalCost = Math.max(0, totalCost) // Ensure non-negative
    } else if (['REFUND', 'LIQUIDATION', 'REDEMPTION'].includes(transaction.type)) {
      // Corporate actions that liquidate entire position (like capital repayment)
      console.log(`💰 Corporate action ${transaction.type} for ${symbol}: liquidating ${totalQuantity} shares`)
      totalQuantity = 0
      totalCost = 0
    }
    // Handle other transaction types (DIVIDEND, SPLIT, MERGER) as needed
  }

  if (totalQuantity > 0) {
    const avgPrice = totalCost / totalQuantity
    
    // Get currency from the latest transaction for this symbol
    const latestTransactionWithCurrency = await prisma.transaction.findFirst({
      where: {
        portfolioId: portfolioId,
        symbol: symbol
      },
      orderBy: {
        date: 'desc'
      },
      select: {
        currency: true
      }
    })
    const currency = latestTransactionWithCurrency?.currency || 'NOK'

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
        currency: currency,
        lastUpdated: new Date()
      },
      create: {
        portfolioId: portfolioId,
        symbol: symbol,
        quantity: totalQuantity,
        avgPrice: avgPrice,
        currency: currency
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

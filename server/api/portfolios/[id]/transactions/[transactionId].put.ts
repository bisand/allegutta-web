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
        currency: body.currency || portfolio.currency || 'NOK',
        date: body.date ? new Date(body.date) : undefined,
        notes: body.notes
      }
    })

    // Recalculate holdings for the old symbol (if changed)
    if (body.symbol && existingTransaction.symbol !== body.symbol.toUpperCase()) {
      await updateHoldings(portfolioId, existingTransaction.symbol)
    }

    // Recalculate holdings for the current symbol
    await updateHoldings(portfolioId, transaction.symbol)

    // Recalculate cash holdings using saldo-inspired logic
    await recalculateCashHoldings(portfolioId, portfolio.currency || 'NOK')

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
    if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN', 'DIVIDEND_REINVEST', 'RIGHTS_ALLOCATION', 'RIGHTS_ISSUE'].includes(transaction.type)) {
      totalQuantity += transaction.quantity
      totalCost += transaction.quantity * transaction.price + (transaction.fees || 0)
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

// Function to recalculate cash holdings like the Norwegian broker saldo system
async function recalculateCashHoldings(portfolioId: string, portfolioCurrency: string): Promise<void> {
  const cashSymbol = `CASH_${portfolioCurrency}`
  
  // Get ALL transactions for this portfolio in chronological order (like saldo progression)
  const allTransactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId
    },
    orderBy: {
      date: 'asc'  // Oldest first, like saldo progression in reverse
    }
  })
  
  let runningCashBalance = 0
  
  // Process each transaction chronologically to build running cash balance
  for (const transaction of allTransactions) {
    const amount = transaction.quantity * transaction.price
    const fees = transaction.fees || 0
    
    // Calculate cash impact exactly like Norwegian broker saldo changes
    let cashImpact = 0
    
    if (transaction.symbol.startsWith('CASH_')) {
      // Direct cash transactions
      switch (transaction.type) {
        case 'DEPOSIT':
        case 'REFUND':
        case 'DIVIDEND':
        case 'DIVIDEND_REINVEST':
        case 'LIQUIDATION':
        case 'REDEMPTION':
        case 'DECIMAL_LIQUIDATION':
        case 'SPIN_OFF_IN':
        case 'TRANSFER_IN':
          cashImpact = amount - fees  // Money coming in minus fees
          break
          
        case 'WITHDRAWAL':
        case 'DECIMAL_WITHDRAWAL':
        case 'INTEREST_CHARGE':
          cashImpact = -(amount + fees)  // Money going out plus fees
          break
      }
    } else {
      // Stock/security transactions affect cash
      switch (transaction.type) {
        case 'BUY':
        case 'RIGHTS_ALLOCATION':
        case 'RIGHTS_ISSUE':
          cashImpact = -(amount + fees)  // Purchase: cash decreases by amount + fees
          break
          
        case 'SELL':
          cashImpact = amount - fees  // Sale: cash increases by amount - fees
          break
          
        case 'DIVIDEND':
        case 'DIVIDEND_REINVEST':
          cashImpact = amount - fees  // Dividend: cash increases by amount - fees
          break
          
        case 'LIQUIDATION':
        case 'REDEMPTION':
        case 'DECIMAL_LIQUIDATION':
        case 'SPIN_OFF_IN':
          cashImpact = amount - fees  // Corporate actions that bring cash
          break
          
        case 'EXCHANGE_IN':
          cashImpact = amount - fees  // Exchange in brings cash
          break
          
        case 'EXCHANGE_OUT':
          cashImpact = -(amount + fees)  // Exchange out removes cash
          break
          
        case 'SPLIT':
        case 'MERGER':
          cashImpact = -fees  // Only fees affect cash for stock splits/mergers
          break
      }
    }
    
    runningCashBalance += cashImpact
  }
  
  // Set the final cash balance (like final saldo)
  if (runningCashBalance !== 0 || await prisma.holding.findUnique({
    where: { portfolioId_symbol: { portfolioId, symbol: cashSymbol } }
  })) {
    await prisma.holding.upsert({
      where: {
        portfolioId_symbol: {
          portfolioId,
          symbol: cashSymbol
        }
      },
      update: {
        quantity: runningCashBalance,
        avgPrice: 1.0,
        currency: portfolioCurrency,
        lastUpdated: new Date()
      },
      create: {
        portfolioId,
        symbol: cashSymbol,
        quantity: runningCashBalance,
        avgPrice: 1.0,
        currency: portfolioCurrency
      }
    })
    
    console.log(`💰 Recalculated cash balance: ${runningCashBalance} ${portfolioCurrency} (like saldo: ${runningCashBalance})`)
  }
}

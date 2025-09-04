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

    // Recalculate cash holdings using saldo-inspired logic
    await recalculateCashHoldings(portfolioId, portfolio.currency || 'NOK')

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
  if (symbol.startsWith('CASH_')) {
    // Handle cash holdings - sum all direct cash transactions AND stock transaction impacts
    const allTransactions = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolioId
      },
      orderBy: {
        date: 'asc'
      }
    })

    let totalCash = 0
    
    for (const transaction of allTransactions) {
      // Use the more accurate 'amount' field when available, otherwise calculate
      const amount = transaction.amount ?? (transaction.quantity * transaction.price)
      
      // Direct cash transactions
      if (transaction.symbol === symbol && [
        'DEPOSIT', 'WITHDRAWAL', 'REFUND',           // Direct cash transactions
        'DIVIDEND',                                  // Dividends increase cash
        'LIQUIDATION', 'REDEMPTION',                 // Liquidations increase cash
        'DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL', // Decimal adjustments
        'SPIN_OFF_IN',                              // Spin-offs can create cash
        'TILBAKEBETALING', 'UTBYTTE_KONTANT'        // Norwegian types
      ].includes(transaction.type)) {
        if (['DEPOSIT', 'DIVIDEND', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'DECIMAL_LIQUIDATION', 'SPIN_OFF_IN', 'TILBAKEBETALING', 'UTBYTTE_KONTANT'].includes(transaction.type)) {
          totalCash += amount  // These increase cash
        } else if (['WITHDRAWAL', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
          totalCash -= amount  // These decrease cash
        }
      }
      
      // Stock transaction impacts on cash (all non-cash symbols)
      if (!transaction.symbol.startsWith('CASH_')) {
        const totalAmount = amount + (transaction.fees || 0)
        
        if (['BUY', 'EXCHANGE_IN', 'DIVIDEND_REINVEST', 'RIGHTS_ALLOCATION', 'RIGHTS_ISSUE'].includes(transaction.type)) {
          totalCash -= totalAmount  // Stock purchases decrease cash
        } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
          totalCash += totalAmount  // Stock sales increase cash
        }
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
          currency: currency
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
    const latestTransactionWithCurrency = await prisma.transaction.findFirst({
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
        currency: currency
      },
      create: {
        portfolioId,
        symbol,
        quantity: totalQuantity,
        avgPrice,
        currency: currency
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
    // Use the more accurate 'amount' field when available, otherwise calculate
    const amount = transaction.amount ?? (transaction.quantity * transaction.price)
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
        case 'INTEREST_CHARGE': {
          // For withdrawals: ensure amount is negative (manual entries are positive, imports are negative)
          const withdrawalAmount = amount > 0 ? -amount : amount
          cashImpact = withdrawalAmount - fees  // Money going out: negative amount minus fees
          break
        }
        
        case 'SALDO_ADJUSTMENT':
          cashImpact = amount - fees  // Direct adjustment to match broker saldo
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
  
  // Check if we have a recent saldo value to validate against
  const latestTransactionWithSaldo = await prisma.transaction.findFirst({
    where: {
      portfolioId: portfolioId,
      saldo: { not: null }
    },
    orderBy: {
      date: 'desc'
    }
  })
  
  if (latestTransactionWithSaldo?.saldo !== null && latestTransactionWithSaldo?.saldo !== undefined) {
    const brokerSaldo = latestTransactionWithSaldo.saldo
    const discrepancy = runningCashBalance - brokerSaldo
    
    console.log(`📊 Saldo validation: calculated=${runningCashBalance}, broker=${brokerSaldo}, discrepancy=${discrepancy}`)
    
    // If there's a significant discrepancy (more than 0.01 due to rounding), create adjustment
    if (Math.abs(discrepancy) > 0.01) {
      console.log(`⚠️  Saldo discrepancy detected: ${discrepancy} ${portfolioCurrency}. Creating adjustment transaction.`)
      
      // Create a SALDO_ADJUSTMENT transaction to align with broker's balance
      await prisma.transaction.create({
        data: {
          portfolioId: portfolioId,
          symbol: cashSymbol,
          type: 'SALDO_ADJUSTMENT',
          quantity: -discrepancy,  // Negative to correct the discrepancy
          price: 1.0,
          fees: 0,
          currency: portfolioCurrency,
          date: new Date(latestTransactionWithSaldo.date.getTime() + 1000), // 1 second after the reference transaction
          notes: `Automatic adjustment to match broker saldo (${brokerSaldo}). Corrected discrepancy of ${discrepancy}.`,
          saldo: brokerSaldo
        }
      })
      
      // Update the running balance with the adjustment
      runningCashBalance = brokerSaldo
      console.log(`✅ Created saldo adjustment. New balance: ${runningCashBalance} ${portfolioCurrency}`)
    }
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
        currency: portfolioCurrency
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

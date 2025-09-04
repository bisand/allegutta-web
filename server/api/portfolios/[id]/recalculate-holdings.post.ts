import prisma from '../../../lib/prisma'
import type { Holding } from '@prisma/client'

export default defineEventHandler(async (event) => {
  try {
    // Get portfolio ID from URL
    const portfolioId = getRouterParam(event, 'id')
    
    if (!portfolioId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Portfolio ID is required'
      })
    }

    console.log(`🔧 Forcing recalculation of holdings and cash for portfolio: ${portfolioId}`)

    // First, update the cash balance for the portfolio
    await updateCashBalance(portfolioId)

    // Get all unique symbols in the portfolio (excluding cash symbols)
    const uniqueSymbols = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolioId,
        NOT: {
          symbol: {
            startsWith: 'CASH_'
          }
        }
      },
      select: {
        symbol: true
      },
      distinct: ['symbol']
    })

    console.log(`📊 Found ${uniqueSymbols.length} unique securities to recalculate`)
    
    // Recalculate holdings for each security (no cash symbols)
    for (const { symbol } of uniqueSymbols) {
      console.log(`🔄 Recalculating holdings for: ${symbol}`)
      await updateSecurityHoldings(portfolioId, symbol)
    }

    // Get the updated portfolio with cash balance
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      select: { cashBalance: true }
    })

    // Get all updated holdings
    const allHoldings = await prisma.holding.findMany({
      where: {
        portfolioId: portfolioId
      },
      orderBy: {
        symbol: 'asc'
      }
    })

    return {
      success: true,
      message: 'Holdings and cash balance recalculated successfully',
      portfolioId,
      symbolsProcessed: uniqueSymbols.length,
      cashBalance: portfolio?.cashBalance || 0,
      holdings: allHoldings.map((h: Holding) => ({
        symbol: h.symbol,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        updatedAt: h.updatedAt
      }))
    }

  } catch (error) {
    console.error('Holdings recalculation error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to recalculate holdings'
    })
  }
})

// Calculate and update the cash balance for a portfolio
async function updateCashBalance(portfolioId: string): Promise<void> {
  console.log(`� Recalculating cash balance for portfolio: ${portfolioId}`)
  
    // Get all cash-affecting transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      OR: [
        // Direct cash transactions (excluding dividend reinvestments)
        {
          symbol: {
            startsWith: 'CASH_'
          },
          type: {
            not: 'DIVIDEND_REINVEST'  // Exclude dividend reinvestments as they don't affect cash
          }
        },
        // Stock transactions that affect cash
        {
          type: {
            in: ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'DIVIDEND', 'RIGHTS_ISSUE']
          }
        }
      ]
    },
    orderBy: {
      date: 'asc'
    }
  })

  console.log(`� Found ${transactions.length} cash-affecting transactions`)

  let cashBalance = 0
  
  for (const transaction of transactions) {
    // Use the more accurate 'amount' field when available, otherwise calculate
    const amount = transaction.amount ?? (transaction.quantity * transaction.price)
    const fees = transaction.fees || 0
    
    if (transaction.symbol.startsWith('CASH_')) {
      // Direct cash transactions
      if (['DEPOSIT', 'DIVIDEND', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'DECIMAL_LIQUIDATION', 'SPIN_OFF_IN', 'TRANSFER_IN', 'SALDO_ADJUSTMENT'].includes(transaction.type)) {
        cashBalance += amount  // These increase cash
      } else if (['WITHDRAWAL', 'DECIMAL_WITHDRAWAL', 'INTEREST_CHARGE'].includes(transaction.type)) {
        cashBalance -= amount  // These decrease cash
      }
      // Note: DIVIDEND_REINVEST is excluded - it doesn't affect cash as dividends go directly to shares
    } else {
      // Stock transactions that affect cash
      if (['BUY', 'EXCHANGE_IN', 'RIGHTS_ISSUE'].includes(transaction.type)) {
        cashBalance -= (amount + fees)  // Buying stocks/rights decreases cash (including fees)
      } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
        cashBalance += (amount - fees)  // Selling stocks increases cash (minus fees)
      } else if (transaction.type === 'DIVIDEND') {
        cashBalance += amount  // Dividends increase cash
      }
      // Note: DIVIDEND_REINVEST and RIGHTS_ALLOCATION typically don't affect cash directly
      // as they convert cash to shares or allocate existing rights
    }
  }
  
  console.log(`💰 Calculated cash balance: ${cashBalance.toFixed(2)} NOK`)

  // Update the portfolio's cash balance
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { cashBalance }
  })
  
  console.log(`✅ Updated portfolio cash balance to: ${cashBalance.toFixed(2)} NOK`)
}

// Calculate and update holdings for a specific security (not cash)
async function updateSecurityHoldings(portfolioId: string, symbol: string): Promise<void> {
  // Skip cash symbols - they're handled by updateCashBalance
  if (symbol.startsWith('CASH_')) {
    return
  }
  
  console.log(`� Recalculating security holdings for: ${symbol}`)
  
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      symbol: symbol,
      type: {
        in: [
          'BUY', 'SELL',                    // Standard buy/sell transactions
          'EXCHANGE_IN', 'EXCHANGE_OUT',    // Exchange transactions (treat as buy/sell)
          'SPIN_OFF_IN',                    // Spin-offs that create new holdings
          'DECIMAL_LIQUIDATION',            // Decimal adjustments
          'DECIMAL_WITHDRAWAL',             // Decimal withdrawals
          'REFUND', 'LIQUIDATION', 'REDEMPTION'  // Corporate actions that liquidate positions
        ]
      }
    },
    orderBy: {
      date: 'asc'
    }
  })

  console.log(`📊 Found ${transactions.length} transactions for ${symbol}`)

  let totalQuantity = 0
  let totalCost = 0

  for (const transaction of transactions) {
    const quantity = transaction.quantity
    const price = transaction.price
    const fees = transaction.fees || 0
    
    if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN'].includes(transaction.type)) {
      // These increase holdings
      totalQuantity += quantity
      totalCost += quantity * price + fees
      console.log(`  ➕ ${transaction.type}: +${quantity} shares`)
    } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
      // These decrease holdings
      const sellQuantity = Math.min(quantity, totalQuantity)
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
      
      totalQuantity -= sellQuantity
      totalCost -= sellQuantity * avgPrice
      totalCost = Math.max(0, totalCost) // Ensure non-negative
      console.log(`  ➖ ${transaction.type}: -${sellQuantity} shares`)
    } else if (['REFUND', 'LIQUIDATION', 'REDEMPTION'].includes(transaction.type)) {
      // Corporate actions that liquidate entire position (like capital repayment)
      console.log(`  💰 ${transaction.type}: LIQUIDATING ${totalQuantity} shares (corporate action)`)
      totalQuantity = 0
      totalCost = 0
    } else if (['DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
      // Handle decimal adjustments - these typically adjust small quantities
      if (transaction.type === 'DECIMAL_LIQUIDATION') {
        totalQuantity += quantity  // Add fractional shares
        console.log(`  🔢 Decimal liquidation: +${quantity} shares`)
      } else {
        totalQuantity -= quantity  // Remove fractional shares
        console.log(`  🔢 Decimal withdrawal: -${quantity} shares`)
      }
    }
  }

  console.log(`📊 Final calculation for ${symbol}: ${totalQuantity} shares, cost: ${totalCost}`)

  if (totalQuantity > 0) {
    const avgPrice = totalCost / totalQuantity
    const isin = transactions[0]?.isin || null
    const currency = transactions[0]?.currency || 'NOK'

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
        isin: isin,
        currency: currency
      },
      create: {
        portfolioId: portfolioId,
        symbol: symbol,
        isin: isin,
        quantity: totalQuantity,
        avgPrice: avgPrice,
        currency: currency
      }
    })
    console.log(`✅ Updated ${symbol} holding: ${totalQuantity} shares @ ${avgPrice.toFixed(2)}`)
  } else {
    // Remove holding if quantity is 0
    await prisma.holding.deleteMany({
      where: {
        portfolioId: portfolioId,
        symbol: symbol
      }
    })
    console.log(`❌ Removed ${symbol} holding (quantity is 0)`)
  }
}

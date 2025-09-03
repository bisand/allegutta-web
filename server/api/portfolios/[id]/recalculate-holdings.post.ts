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

    console.log(`🔧 Forcing recalculation of holdings for portfolio: ${portfolioId}`)

    // Get all unique symbols in the portfolio
    const uniqueSymbols = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolioId
      },
      select: {
        symbol: true
      },
      distinct: ['symbol']
    })

    console.log(`📊 Found ${uniqueSymbols.length} unique symbols to recalculate`)
    
    // Recalculate holdings for each symbol
    for (const { symbol } of uniqueSymbols) {
      console.log(`🔄 Recalculating holdings for: ${symbol}`)
      await updateHoldings(portfolioId, symbol)
    }

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
      message: 'Holdings recalculated successfully',
      portfolioId,
      symbolsProcessed: uniqueSymbols.length,
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

// Same holdings calculation logic as in other files
async function updateHoldings(portfolioId: string, symbol: string): Promise<void> {
  if (symbol.startsWith('CASH_')) {
    console.log(`🔧 Recalculating cash holdings for portfolio: ${portfolioId}`)
    
    // 1. Get direct cash transactions for this specific cash symbol
    const directCashTransactions = await prisma.transaction.findMany({
      where: {
        portfolioId: portfolioId,
        symbol: symbol,
        type: {
          in: [
            'DEPOSIT', 'WITHDRAWAL', 'REFUND',           // Direct cash transactions
            'DIVIDEND',                                  // Dividends increase cash
            'LIQUIDATION', 'REDEMPTION',                 // Liquidations increase cash
            'DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL', // Decimal adjustments
            'SPIN_OFF_IN'                               // Spin-offs can create cash
          ]
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    console.log(`💰 Found ${directCashTransactions.length} direct cash transactions`)

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
          in: ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT']
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    console.log(`📈 Found ${stockTransactions.length} stock transactions affecting cash`)

    let totalCash = 0
    
    // Process direct cash transactions
    for (const transaction of directCashTransactions) {
      const amount = transaction.quantity * transaction.price
      
      if (['DEPOSIT', 'DIVIDEND', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'DECIMAL_LIQUIDATION', 'SPIN_OFF_IN'].includes(transaction.type)) {
        totalCash += amount  // These increase cash
      } else if (['WITHDRAWAL', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
        totalCash -= amount  // These decrease cash
      }
    }
    
    console.log(`💰 Cash from direct transactions: ${totalCash.toFixed(2)} NOK`)
    
    // Process stock transactions that affect cash (no automatic cash transactions exist)
    let stockCashImpact = 0
    for (const transaction of stockTransactions) {
      const amount = transaction.quantity * transaction.price
      const fees = transaction.fees || 0
      
      if (['BUY', 'EXCHANGE_IN'].includes(transaction.type)) {
        stockCashImpact -= (amount + fees)  // Buying stocks decreases cash (including fees)
      } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
        stockCashImpact += (amount - fees)  // Selling stocks increases cash (minus fees)
      }
    }
    
    console.log(`📈 Cash impact from stock transactions: ${stockCashImpact.toFixed(2)} NOK`)
    
    totalCash += stockCashImpact
    console.log(`💰 Total calculated cash: ${totalCash.toFixed(2)} NOK`)

    if (totalCash !== 0) {
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
          currency: 'NOK'
        },
        create: {
          portfolioId: portfolioId,
          symbol: symbol,
          quantity: totalCash,
          avgPrice: 1.0,
          currency: 'NOK'
        }
      })
      console.log(`✅ Updated CASH_NOK holding to: ${totalCash.toFixed(2)} NOK`)
    } else {
      // Remove cash holding if balance is 0
      await prisma.holding.deleteMany({
        where: {
          portfolioId: portfolioId,
          symbol: symbol
        }
      })
      console.log(`❌ Removed CASH_NOK holding (balance is 0)`)
    }
  } else {
    // Handle security holdings - include all security-affecting transactions
    console.log(`🔧 Recalculating security holdings for: ${symbol}`)
    
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
}

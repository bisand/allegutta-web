import prisma from '../../../../lib/prisma'
import { requireAuth } from '../../../../lib/auth'

interface CSVRow {
  [key: string]: string
}

interface TransactionData {
  portfolioId: string
  symbol: string
  type: string
  quantity: number
  price: number
  fees: number
  date: Date
  notes: string | null
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  
  while (i < line.length) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        current += '"'
        i += 2
      } else {
        inQuotes = !inQuotes
        i++
      }
    } else if (char === '\t' && !inQuotes) {
      result.push(current.trim())
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }
  
  result.push(current.trim())
  return result
}

function mapTransactionType(norwegianType: string): string | null {
  const typeMap: { [key: string]: string } = {
    'KJØPT': 'BUY',
    'SALG': 'SELL',
    'UTBYTTE': 'DIVIDEND',
    'INNSKUDD': 'DEPOSIT',
    'UTTAK INTERNET': 'WITHDRAWAL',
    'TILBAKEBETALING': 'REFUND',
    'INNL. VP LIKVID': 'LIQUIDATION',
    'INNLØSN. UTTAK VP': 'REDEMPTION',
    'BYTTE INNLEGG VP': 'EXCHANGE_IN',
    'BYTTE UTTAK VP': 'EXCHANGE_OUT',
    'UTSKILLING FISJON IN': 'SPIN_OFF_IN',
    'SLETTING DESIM. LIKV': 'DECIMAL_LIQUIDATION',
    'SLETTING DESIM. UTTA': 'DECIMAL_WITHDRAWAL'
  }
  
  return typeMap[norwegianType] || null
}

function parseNorwegianDate(dateStr: string): Date {
  // Format: YYYY-MM-DD
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  }
  throw new Error(`Invalid date format: ${dateStr}`)
}

function parseNorwegianNumber(numberStr: string): number {
  if (!numberStr || numberStr.trim() === '') return 0
  // Remove any whitespace and handle Norwegian decimal format
  return parseFloat(numberStr.replace(/\s/g, '').replace(',', '.')) || 0
}

// POST /api/portfolios/[id]/transactions/import - Import transactions from CSV
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

  if (!body.csvData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'CSV data is required'
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

    // Parse CSV data
    const lines = body.csvData.split('\n').filter((line: string) => line.trim())
    if (lines.length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid CSV format'
      })
    }

    const headers = parseCSVLine(lines[0])
    const transactions: TransactionData[] = []
    const errors: string[] = []
    let successCount = 0
    let skippedCount = 0

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i])
        if (values.length !== headers.length) {
          errors.push(`Line ${i + 1}: Invalid number of columns`)
          continue
        }

        // Create object from headers and values
        const csvRow: CSVRow = {}
        headers.forEach((header, index) => {
          csvRow[header] = values[index]
        })

        // Map transaction type
        const transactionType = mapTransactionType(csvRow.Transaksjonstype)
        if (!transactionType) {
          skippedCount++
          continue // Skip unsupported transaction types
        }

        // Only process transactions with securities (ignore cash transactions)
        if (!csvRow.Verdipapir || csvRow.Verdipapir.trim() === '') {
          skippedCount++
          continue
        }

        // Check if transaction already exists
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            portfolioId: portfolioId,
            symbol: csvRow.Verdipapir.toUpperCase(),
            date: parseNorwegianDate(csvRow.Bokføringsdag),
            quantity: parseNorwegianNumber(csvRow.Antall),
            price: parseNorwegianNumber(csvRow.Kurs),
            notes: csvRow.Transaksjonstekst
          }
        })

        if (existingTransaction) {
          skippedCount++
          continue // Skip duplicate transactions
        }

        const quantity = parseNorwegianNumber(csvRow.Antall)
        const price = parseNorwegianNumber(csvRow.Kurs)
        const fees = parseNorwegianNumber(csvRow['Totale Avgifter']) || parseNorwegianNumber(csvRow.Kurtasje) || 0

        // Only process transactions with valid quantity and price for BUY/SELL
        if ((transactionType === 'BUY' || transactionType === 'SELL') && (quantity <= 0 || price <= 0)) {
          errors.push(`Line ${i + 1}: Invalid quantity or price for ${transactionType} transaction`)
          continue
        }

        const transactionData = {
          portfolioId: portfolioId,
          symbol: csvRow.Verdipapir.toUpperCase(),
          type: transactionType,
          quantity: Math.abs(quantity), // Ensure positive quantity
          price: price,
          fees: fees,
          date: parseNorwegianDate(csvRow.Bokføringsdag),
          notes: csvRow.Transaksjonstekst || null
        }

        transactions.push(transactionData)
      } catch (error) {
        errors.push(`Line ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Create transactions in batch
    if (transactions.length > 0) {
      await prisma.transaction.createMany({
        data: transactions
      })
      successCount = transactions.length

      // Update holdings for each unique symbol
      const uniqueSymbols = [...new Set(transactions.map(t => t.symbol))]
      for (const symbol of uniqueSymbols) {
        await updateHoldings(portfolioId, symbol)
      }
    }

    return {
      success: true,
      message: `Import completed. ${successCount} transactions imported, ${skippedCount} skipped.`,
      data: {
        imported: successCount,
        skipped: skippedCount,
        errors: errors
      }
    }
  } catch (error) {
    console.error('Import error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to import transactions'
    })
  }
})

// Helper function to update holdings based on transactions
async function updateHoldings(portfolioId: string, symbol: string): Promise<void> {
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      symbol: symbol,
      type: {
        in: ['BUY', 'SELL'] // Only consider buy/sell for holdings calculation
      }
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

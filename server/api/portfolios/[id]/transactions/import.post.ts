import prisma from '../../../../lib/prisma'
import { requireAuth } from '../../../../lib/auth'

interface CSVRow {
  [key: string]: string
}

interface TransactionData {
  portfolioId: string
  symbol: string
  isin?: string | null
  type: string
  quantity: number
  price: number
  fees: number
  date: Date
  notes: string | null
  saldo?: number | null
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
    'SLETTING DESIM. UTTA': 'DECIMAL_WITHDRAWAL',
    'SPLITT UTTAK VP': 'LIQUIDATION',        // Split withdrawal - liquidates old position
    'SPLITT INNLEGG VP': 'SPIN_OFF_IN',      // Split deposit - creates new position
    
    // Additional Norwegian transaction types
    'INNSKUDD KONTANTER': 'DEPOSIT',         // Cash deposit
    'TILDELING INNLEGG RE': 'RIGHTS_ALLOCATION', // Rights allocation
    'INNLEGG OVERFØRING': 'TRANSFER_IN',     // Transfer deposit  
    'SLETTING UTTAK VP': 'LIQUIDATION',      // Deletion withdrawal
    'UTBYTTE INNLEGG VP': 'DIVIDEND',        // Dividend deposit
    'REINVESTERT UTBYTTE': 'DIVIDEND_REINVEST', // Reinvested dividend
    'OVERBELÅNINGSRENTE': 'INTEREST_CHARGE', // Overdraft interest (negative)
    'EMISJON INNLEGG VP': 'RIGHTS_ISSUE',    // Rights issue/emission
    'DEBETRENTE': 'INTEREST_CHARGE'          // Debit interest (negative)
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

    // Parse all transactions first to sort them chronologically
    const parsedTransactions: Array<{
      csvRow: CSVRow,
      date: Date,
      lineNumber: number
    }> = []

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

        // Parse date and add to array for sorting
        const date = parseNorwegianDate(csvRow.Bokføringsdag)
        parsedTransactions.push({
          csvRow,
          date,
          lineNumber: i + 1
        })
      } catch (error) {
        errors.push(`Line ${i + 1}: Error parsing line - ${error}`)
      }
    }

    // Sort transactions by date (oldest first) for proper saldo progression
    parsedTransactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Now process transactions in chronological order
    for (const { csvRow, lineNumber } of parsedTransactions) {
      try {
        // Map transaction type
        const mappedTransactionType = mapTransactionType(csvRow.Transaksjonstype)
        if (!mappedTransactionType) {
          skippedCount++
          continue // Skip unsupported transaction types
        }

                // Handle cash transactions (deposits, withdrawals, dividends, etc.)
        let symbol = csvRow.Verdipapir ? csvRow.Verdipapir.toUpperCase() : null
        const transactionType = mappedTransactionType
        
        // Get portfolio currency for dynamic cash holdings
        const portfolioCurrency = portfolio.currency || 'NOK'
        
        // For cash transactions without a security symbol, use CASH with portfolio currency
        if (!symbol || symbol.trim() === '') {
          if (['DEPOSIT', 'WITHDRAWAL', 'REFUND', 'DIVIDEND', 'DIVIDEND_REINVEST', 'TRANSFER_IN', 'INTEREST_CHARGE'].includes(transactionType)) {
            symbol = `CASH_${portfolioCurrency}`
          } else {
            // Skip other transactions without securities
            skippedCount++
            continue
          }
        }
        
        // Special handling: Dividends should always use portfolio currency for cash symbol
        if (['DIVIDEND', 'DIVIDEND_REINVEST'].includes(transactionType)) {
          symbol = `CASH_${portfolioCurrency}`
          // Keep original transaction type - don't change it to 'DEPOSIT'
        }
        
        // Special handling: Interest and transfer transactions should use CASH_NOK
        if (['INTEREST_CHARGE', 'TRANSFER_IN'].includes(transactionType)) {
          symbol = 'CASH_NOK'
        }
        
        // Keep exchange transactions as their original types - don't convert to BUY/SELL
        // The holdings calculation will handle the cash flow appropriately

        // Check if transaction already exists
        // For cash transactions, we need to check the actual values we'll store
        let checkQuantity, checkPrice
        if (symbol.startsWith('CASH_')) {
          checkQuantity = Math.abs(parseNorwegianNumber(csvRow.Beløp) || 0)
          checkPrice = 1.0
          if (['WITHDRAWAL'].includes(transactionType)) {
            checkQuantity = -checkQuantity
          }
        } else {
          checkQuantity = parseNorwegianNumber(csvRow.Antall)
          checkPrice = parseNorwegianNumber(csvRow.Kurs)
        }

        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            portfolioId: portfolioId,
            symbol: symbol,
            date: parseNorwegianDate(csvRow.Bokføringsdag),
            quantity: checkQuantity,
            price: checkPrice,
            notes: csvRow.Transaksjonstekst
          }
        })

        if (existingTransaction) {
          skippedCount++
          continue // Skip duplicate transactions
        }

        const quantity = parseNorwegianNumber(csvRow.Antall)
        const price = parseNorwegianNumber(csvRow.Kurs)
        const amount = parseNorwegianNumber(csvRow.Beløp) // Cash amount from Beløp column
        const fees = parseNorwegianNumber(csvRow['Totale Avgifter']) || parseNorwegianNumber(csvRow.Kurtasje) || 0

        // Handle different transaction types
        let finalQuantity = Math.abs(quantity || 0)
        let finalPrice = price || 1.0

        if (symbol.startsWith('CASH_')) {
          // For cash transactions, use the Beløp (amount) column
          finalQuantity = Math.abs(amount || 0)
          finalPrice = 1.0
          
          // For withdrawals, make quantity negative to represent cash going out
          if (transactionType === 'WITHDRAWAL') {
            finalQuantity = -finalQuantity
          }
        } else {
          // For security transactions, validate quantity and price
          if ((transactionType === 'BUY' || transactionType === 'SELL') && (finalQuantity <= 0 || finalPrice <= 0)) {
            errors.push(`Line ${lineNumber}: Invalid quantity or price for ${transactionType} transaction`)
            continue
          }
        }

        // Extract ISIN if available
        let isin: string | null = null
        
        // Check common Norwegian CSV ISIN field names
        if (csvRow.ISIN) {
          isin = csvRow.ISIN.trim()
        } else if (csvRow.Isin) {
          isin = csvRow.Isin.trim()
        } else if (csvRow.isin) {
          isin = csvRow.isin.trim()
        }
        
        // Validate ISIN format (12 characters: 2 letters + 9 alphanumeric + 1 check digit)
        if (isin && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) {
          console.warn(`Invalid ISIN format for ${symbol}: ${isin}`)
          isin = null
        }

        const transactionData = {
          portfolioId: portfolioId,
          symbol: symbol,
          isin: isin,
          type: transactionType,
          quantity: finalQuantity,
          price: finalPrice,
          fees: fees,
          currency: portfolioCurrency,
          date: parseNorwegianDate(csvRow.Bokføringsdag),
          notes: csvRow.Transaksjonstekst || null,
          saldo: csvRow.Saldo ? parseFloat(csvRow.Saldo) : null  // Store broker's saldo if available
        }

        transactions.push(transactionData)
      } catch (error) {
        errors.push(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

      // Use new saldo-based validation system for cash holdings
      const portfolioCurrency = portfolio.currency || 'NOK'
      await recalculateCashHoldings(portfolioId, portfolioCurrency)
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
  // Get the latest ISIN for this symbol from transactions
  const latestTransaction = await prisma.transaction.findFirst({
    where: {
      portfolioId: portfolioId,
      symbol: symbol,
      isin: { not: null }
    },
    orderBy: {
      date: 'desc'
    },
    select: {
      isin: true
    }
  })
  
  const isin = latestTransaction?.isin || null

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
          isin: isin,
          lastUpdated: new Date()
        },
        create: {
          portfolioId: portfolioId,
          symbol: symbol,
          isin: isin,
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
  } else {
    // Handle security holdings - include all security-affecting transactions
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
            'REFUND', 'LIQUIDATION', 'REDEMPTION',  // Corporate actions that liquidate positions
            'RIGHTS_ALLOCATION', 'RIGHTS_ISSUE'     // Rights allocations and issues
          ]
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    let totalQuantity = 0
    let totalCost = 0

    for (const transaction of transactions) {
      const quantity = transaction.quantity
      const price = transaction.price
      const fees = transaction.fees
      
      if (['BUY', 'EXCHANGE_IN', 'SPIN_OFF_IN', 'DIVIDEND_REINVEST', 'RIGHTS_ALLOCATION', 'RIGHTS_ISSUE'].includes(transaction.type)) {
        // These increase holdings
        totalQuantity += quantity
        totalCost += quantity * price + fees
      } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
        // These decrease holdings
        const sellQuantity = Math.min(quantity, totalQuantity)
        const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0
        
        totalQuantity -= sellQuantity
        totalCost -= sellQuantity * avgPrice
        totalCost = Math.max(0, totalCost) // Ensure non-negative
      } else if (['REFUND', 'LIQUIDATION', 'REDEMPTION'].includes(transaction.type)) {
        // Corporate actions that liquidate entire position (like capital repayment)
        // These should zero out the holding regardless of quantity
        console.log(`💰 Corporate action ${transaction.type} for ${symbol}: liquidating ${totalQuantity} shares`)
        totalQuantity = 0
        totalCost = 0
      } else if (['DECIMAL_LIQUIDATION', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
        // Handle decimal adjustments - these typically adjust small quantities
        if (transaction.type === 'DECIMAL_LIQUIDATION') {
          totalQuantity += quantity  // Add fractional shares
        } else {
          totalQuantity -= quantity  // Remove fractional shares
        }
      }
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
          isin: isin,
          lastUpdated: new Date()
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
}

// Function to recalculate cash holdings like the Norwegian broker saldo system
async function recalculateCashHoldings(portfolioId: string, portfolioCurrency: string): Promise<void> {
  const cashSymbol = `CASH_${portfolioCurrency}`
  
  console.log(`🔍 Starting cash recalculation for ${cashSymbol}`)
  
  // Get ALL transactions for this portfolio in chronological order (like saldo progression)
  const allTransactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId
    },
    orderBy: {
      date: 'asc'  // Oldest first, like saldo progression in reverse
    }
  })
  
  console.log(`📊 Processing ${allTransactions.length} transactions`)
  
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
      
      console.log(`💰 ${transaction.type} ${transaction.symbol}: qty=${transaction.quantity}, price=${transaction.price}, amount=${amount}, fees=${fees}, impact=${cashImpact}`)
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
    console.log(`🔄 Running balance after this transaction: ${runningCashBalance}`)
  }
  
  console.log(`🎯 Final calculated cash balance: ${runningCashBalance} ${portfolioCurrency}`)
  
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

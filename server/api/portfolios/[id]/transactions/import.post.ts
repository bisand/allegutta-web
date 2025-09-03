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
    amount?: number | null
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
            lineNumber: number,
            id: number
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

                // Parse date and ID for proper sorting
                const date = parseNorwegianDate(csvRow.Bokføringsdag)
                const id = parseInt(csvRow.Id) || 0  // Use Id field for correct chronological order
                parsedTransactions.push({
                    csvRow,
                    date,
                    lineNumber: i + 1,
                    id
                })
            } catch (error) {
                errors.push(`Line ${i + 1}: Error parsing line - ${error}`)
            }
        }

        // Sort transactions by ID (chronological order) to maintain correct saldo progression
        // ID provides the exact sequence that matches the saldo field progression
        parsedTransactions.sort((a, b) => a.id - b.id)

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
                    saldo: csvRow.Saldo ? parseNorwegianNumber(csvRow.Saldo) : null,  // Store broker's saldo if available
                    amount: amount  // Store the original beløp amount for accurate saldo calculations
                }

                transactions.push(transactionData)
            } catch (error) {
                errors.push(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
        }

        // Create transactions one by one and maintain saldo validation during import
        const portfolioCurrency = portfolio.currency || 'NOK'
        const cashSymbol = `CASH_${portfolioCurrency}`

        console.log(`📈 About to process ${transactions.length} transactions for holdings updates`)
        
        if (transactions.length > 0) {
            console.log(`📊 Processing ${transactions.length} transactions with saldo validation...`)

            let expectedSaldo = 0  // Track expected running saldo

            for (const transactionData of transactions) {
                // Create the transaction
                const createdTransaction = await prisma.transaction.create({
                    data: transactionData
                })

                successCount++
                console.log(`✅ Created transaction: ${createdTransaction.type} ${createdTransaction.symbol} (${createdTransaction.date.toISOString().split('T')[0]})`)

                // If this transaction has a saldo value, check for discrepancy using simple calculation
                if (createdTransaction.saldo !== null && createdTransaction.saldo !== undefined) {
                    // Use the original beløp amount for accurate cash flow calculation
                    // The amount already has the correct sign: positive = cash inflow, negative = cash outflow
                    const cashImpact = createdTransaction.amount || 0

                    expectedSaldo += cashImpact
                    const brokerSaldo = createdTransaction.saldo
                    const discrepancy = expectedSaldo - brokerSaldo

                    console.log(`🔍 Simple saldo check: expected=${expectedSaldo}, broker=${brokerSaldo}, discrepancy=${discrepancy}`)

                    // Create adjustment if discrepancy is significant (more than a few kr as requested)
                    if (Math.abs(discrepancy) > 1.0) {  // Allow a few kr up and down
                        console.log(`⚠️  Saldo discrepancy detected: ${discrepancy} ${portfolioCurrency}. Creating immediate adjustment.`)

                        const adjustmentTransaction = await prisma.transaction.create({
                            data: {
                                portfolioId: portfolioId,
                                symbol: cashSymbol,
                                type: 'SALDO_ADJUSTMENT',
                                quantity: -discrepancy,  // Negative to correct the discrepancy
                                price: 1.0,
                                fees: 0,
                                currency: portfolioCurrency,
                                date: new Date(createdTransaction.date.getTime() + 1000), // 1 second after the reference transaction
                                notes: `Saldo adjustment after ${createdTransaction.type} ${createdTransaction.symbol}. Expected: ${expectedSaldo}, Broker: ${brokerSaldo}, Adjustment: ${-discrepancy}`,
                                saldo: brokerSaldo
                            }
                        })

                        // Update our expected saldo to match broker
                        expectedSaldo = brokerSaldo
                        console.log(`✅ Created saldo adjustment: ${adjustmentTransaction.quantity} ${portfolioCurrency}`)
                    } else {
                        // Update our expected saldo to match broker for next calculation
                        expectedSaldo = brokerSaldo
                        console.log(`✅ Saldo within tolerance (${discrepancy} <= 1.0 kr), using broker value: ${brokerSaldo}`)
                    }
                }
            }

            // Update holdings for each unique symbol after all transactions are processed
            const uniqueSymbols = [...new Set(transactions.map(t => t.symbol))]
            console.log(`🔄 Updating holdings for symbols: ${uniqueSymbols.join(', ')}`)
            
            // Update cash balance first
            await updateCashBalance(portfolioId)
            
            // Update holdings for securities only (skip cash symbols)
            const securitySymbols = uniqueSymbols.filter(symbol => !symbol.startsWith('CASH_'))
            for (const symbol of securitySymbols) {
                console.log(`🔄 Updating holdings for symbol: ${symbol}`)
                await updateSecurityHoldings(portfolioId, symbol)
            }

            console.log(`✅ Import holdings update completed`)
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

// Calculate and update the cash balance for a portfolio
async function updateCashBalance(portfolioId: string): Promise<void> {
  console.log(`� Recalculating cash balance for portfolio: ${portfolioId}`)
  
  // Get all cash-affecting transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      portfolioId: portfolioId,
      OR: [
        // Direct cash transactions
        {
          symbol: {
            startsWith: 'CASH_'
          }
        },
        // Stock transactions that affect cash
        {
          type: {
            in: ['BUY', 'SELL', 'EXCHANGE_IN', 'EXCHANGE_OUT', 'DIVIDEND']
          }
        }
      ]
    },
    orderBy: {
      date: 'asc'
    }
  })

  console.log(`💰 Found ${transactions.length} cash-affecting transactions`)

  let cashBalance = 0
  
  for (const transaction of transactions) {
    const amount = transaction.quantity * transaction.price
    const fees = transaction.fees || 0
    
    if (transaction.symbol.startsWith('CASH_')) {
      // Direct cash transactions
      if (['DEPOSIT', 'DIVIDEND', 'REFUND', 'LIQUIDATION', 'REDEMPTION', 'DECIMAL_LIQUIDATION', 'SPIN_OFF_IN'].includes(transaction.type)) {
        cashBalance += amount  // These increase cash
      } else if (['WITHDRAWAL', 'DECIMAL_WITHDRAWAL'].includes(transaction.type)) {
        cashBalance -= amount  // These decrease cash
      }
    } else {
      // Stock transactions that affect cash
      if (['BUY', 'EXCHANGE_IN'].includes(transaction.type)) {
        cashBalance -= (amount + fees)  // Buying stocks decreases cash (including fees)
      } else if (['SELL', 'EXCHANGE_OUT'].includes(transaction.type)) {
        cashBalance += (amount - fees)  // Selling stocks increases cash (minus fees)
      } else if (transaction.type === 'DIVIDEND') {
        cashBalance += amount  // Dividends increase cash
      }
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
  
  console.log(`📊 Recalculating security holdings for: ${symbol}`)
  
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

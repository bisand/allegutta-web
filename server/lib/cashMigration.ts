import type { PrismaClient } from '@prisma/client'

/**
 * CASH naming convention migration
 * 
 * Migrates from CASH_XXX naming (e.g., CASH_NOK) to simple CASH with currency field
 * This migration is safe to run multiple times and will only update existing records
 */

interface MigrationResult {
  transactionsUpdated: number
  holdingsUpdated: number
  alreadyMigrated: boolean
}

export async function migrateCashNamingConvention(prisma: PrismaClient): Promise<MigrationResult> {
  console.log('🔄 Checking CASH naming convention migration...')
  
  try {
    // Check if migration is needed by looking for CASH_* patterns
    const cashTransactionsCount = await prisma.transactions.count({
      where: {
        symbol: {
          startsWith: 'CASH_'
        }
      }
    })
    
    const cashHoldingsCount = await prisma.holdings.count({
      where: {
        symbol: {
          startsWith: 'CASH_'
        }
      }
    })
    
    if (cashTransactionsCount === 0 && cashHoldingsCount === 0) {
      console.log('✅ CASH naming convention migration not needed (already up-to-date)')
      return {
        transactionsUpdated: 0,
        holdingsUpdated: 0,
        alreadyMigrated: true
      }
    }
    
    console.log(`📊 Found ${cashTransactionsCount} CASH_* transactions and ${cashHoldingsCount} CASH_* holdings to migrate`)
    
    // Validate existing data before migration
    await validateCashData(prisma)
    
    // Perform the migration in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let transactionsUpdated = 0
      let holdingsUpdated = 0
      
      // Update transactions
      if (cashTransactionsCount > 0) {
        const transactionResult = await tx.transactions.updateMany({
          where: {
            symbol: {
              startsWith: 'CASH_'
            }
          },
          data: {
            symbol: 'CASH'
          }
        })
        transactionsUpdated = transactionResult.count
        console.log(`✅ Updated ${transactionsUpdated} transactions from CASH_* to CASH`)
      }
      
      // Update holdings
      if (cashHoldingsCount > 0) {
        const holdingResult = await tx.holdings.updateMany({
          where: {
            symbol: {
              startsWith: 'CASH_'
            }
          },
          data: {
            symbol: 'CASH'
          }
        })
        holdingsUpdated = holdingResult.count
        console.log(`✅ Updated ${holdingsUpdated} holdings from CASH_* to CASH`)
      }
      
      return { transactionsUpdated, holdingsUpdated }
    })
    
    // Verify migration success
    await verifyMigration(prisma)
    
    console.log('✅ CASH naming convention migration completed successfully')
    return {
      ...result,
      alreadyMigrated: false
    }
    
  } catch (error) {
    console.error('❌ CASH naming convention migration failed:', error)
    throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function validateCashData(prisma: PrismaClient): Promise<void> {
  // Get all CASH_* transactions to validate consistency
  const cashTransactions = await prisma.transactions.findMany({
    where: {
      symbol: {
        startsWith: 'CASH_'
      }
    },
    select: {
      id: true,
      symbol: true,
      currency: true
    }
  })
  
  const inconsistencies: string[] = []
  
  for (const transaction of cashTransactions) {
    const expectedCurrency = transaction.symbol.replace('CASH_', '')
    if (transaction.currency !== expectedCurrency) {
      inconsistencies.push(
        `Transaction ${transaction.id}: symbol=${transaction.symbol} but currency=${transaction.currency}`
      )
    }
  }
  
  // Get all CASH_* holdings to validate consistency
  const cashHoldings = await prisma.holdings.findMany({
    where: {
      symbol: {
        startsWith: 'CASH_'
      }
    },
    select: {
      id: true,
      symbol: true,
      currency: true
    }
  })
  
  for (const holding of cashHoldings) {
    const expectedCurrency = holding.symbol.replace('CASH_', '')
    if (holding.currency !== expectedCurrency) {
      inconsistencies.push(
        `Holding ${holding.id}: symbol=${holding.symbol} but currency=${holding.currency}`
      )
    }
  }
  
  if (inconsistencies.length > 0) {
    console.warn('⚠️  Found data inconsistencies (proceeding with migration):')
    inconsistencies.forEach(issue => console.warn(`   ${issue}`))
  }
}

async function verifyMigration(prisma: PrismaClient): Promise<void> {
  // Check that no CASH_* symbols remain
  const remainingCashTransactions = await prisma.transactions.count({
    where: {
      symbol: {
        startsWith: 'CASH_'
      }
    }
  })
  
  const remainingCashHoldings = await prisma.holdings.count({
    where: {
      symbol: {
        startsWith: 'CASH_'
      }
    }
  })
  
  if (remainingCashTransactions > 0 || remainingCashHoldings > 0) {
    throw new Error(
      `Migration verification failed: ${remainingCashTransactions} CASH_* transactions and ${remainingCashHoldings} CASH_* holdings still remain`
    )
  }
  
  // Count new CASH entries
  const newCashTransactions = await prisma.transactions.count({
    where: {
      symbol: 'CASH'
    }
  })
  
  const newCashHoldings = await prisma.holdings.count({
    where: {
      symbol: 'CASH'
    }
  })
  
  console.log(`📊 Migration verification: ${newCashTransactions} CASH transactions, ${newCashHoldings} CASH holdings`)
}
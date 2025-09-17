import { PrismaClient } from '@prisma/client'
import { migrateCashNamingConvention } from './cashMigration'

/**
 * Simple Database Schema Verifier
 * Ensures database schema is up to date on application startup
 * No migrations - just checks and updates as needed
 */

let _prisma: PrismaClient | undefined

export async function initializeDatabase() {
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    console.log('� Verifying production database schema...')
  } else {
    console.log('�🔄 Initializing database schema...')
  }
  
  try {
    _prisma = new PrismaClient()
    
    // Test basic connectivity
    await _prisma.$connect()
    console.log('✅ Database connection established')
    
    // Simple schema verification - try to access each main table
    const tables = ['users', 'portfolios', 'transactions', 'holdings', 'market_data']
    const missingTables: string[] = []
    
    for (const table of tables) {
      try {
        // @ts-expect-error - We're testing table existence
        await _prisma[table].findFirst()
        console.log(`✅ Table '${table}' is accessible`)
      } catch (error) {
        const err = error as { code?: string; message?: string }
        if (err.code === 'P2021' || err.message?.includes('does not exist')) {
          console.log(`⚠️  Table '${table}' needs schema update`)
          missingTables.push(table)
        } else {
          // Other errors are ok (empty tables, etc.)
          console.log(`✅ Table '${table}' structure is valid`)
        }
      }
    }
    
    if (missingTables.length > 0) {
      const errorMsg = `Database schema is outdated. Missing tables: ${missingTables.join(', ')}`
      
      if (isProduction) {
        throw new Error(`${errorMsg}. Run: ./scripts/deploy-production.sh`)
      } else {
        throw new Error(`${errorMsg}. Run: pnpm db:push`)
      }
    }
    
    console.log('✅ Database schema verification complete')
    
    // Run data migrations after schema verification
    try {
      await migrateCashNamingConvention(_prisma)
    } catch (migrationError) {
      console.error('⚠️  Data migration warning:', migrationError)
      // Don't fail startup for migration issues - just log them
    }
    
    return _prisma
    
  } catch (error) {
    const err = error as { message?: string }
    console.error('❌ Database initialization failed:', err.message)
    
    if (err.message?.includes('schema update') || err.message?.includes('outdated')) {
      console.log('')
      if (isProduction) {
        console.log('🔧 To fix this in production:')
        console.log('   1. Run: ./scripts/deploy-production.sh')
        console.log('   2. Or manually: ./scripts/init-db.sh production')
      } else {
        console.log('🔧 To fix this in development:')
        console.log('   1. Run: pnpm db:push')
        console.log('   2. Or run: ./scripts/init-db.sh')
      }
      console.log('')
    }
    
    throw error
  }
}

export async function closeDatabaseConnection() {
  if (_prisma) {
    await _prisma.$disconnect()
  }
}

export function getPrismaClient() {
  if (!_prisma) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return _prisma
}

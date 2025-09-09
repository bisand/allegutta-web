import { initializeDatabase } from '../lib/database'

export default defineNitroPlugin(async (_nitroApp) => {
  // Initialize database schema on server startup
  // This ensures the database is ready without requiring manual migrations
  // PRODUCTION-SAFE: Automatically updates schema while preserving all data
  
  const isProduction = process.env.NODE_ENV === 'production'
  const autoUpdate = process.env.NUXT_AUTO_DB_UPDATE !== 'false' // Default to true
  
  try {
    if (isProduction) {
      console.log('🔍 Production mode: Verifying database schema...')
      if (autoUpdate) {
        console.log('🛡️  Auto-update enabled (production-safe)')
      }
    } else {
      console.log('🔄 Development mode: Initializing database schema...')
    }
    
    await initializeDatabase()
    console.log('🎉 Database initialization complete - server ready!')
    
  } catch (error) {
    console.error('💥 Database initialization failed')
    console.error('Error:', error)
    
    if (isProduction && autoUpdate) {
      console.log('')
      console.log('� Attempting automatic schema update (production-safe)...')
      
      try {
        // Import the production-safe database update function
        const { execSync } = await import('child_process')
        
        // Run the production-safe initialization
        console.log('📦 Creating automatic backup...')
        execSync('./scripts/backup.sh production', { stdio: 'inherit' })
        
        console.log('🔧 Updating schema safely...')
        execSync('./scripts/init-db.sh production', { stdio: 'inherit' })
        
        console.log('✅ Automatic schema update completed!')
        console.log('🔄 Retrying database initialization...')
        
        await initializeDatabase()
        console.log('🎉 Database now ready after automatic update!')
        
      } catch (updateError) {
        console.error('❌ Automatic update failed:', updateError)
        console.log('')
        console.log('🚨 MANUAL INTERVENTION REQUIRED')
        console.log('🔧 Run manually: ./scripts/deploy-production.sh')
        console.log('⚠️  Server starting with limited functionality')
      }
      
    } else if (isProduction) {
      console.log('')
      console.log('�🚨 PRODUCTION ERROR - Database schema verification failed!')
      console.log('🔧 Required action:')
      console.log('   1. Run: ./scripts/deploy-production.sh')
      console.log('   2. Or manually: ./scripts/init-db.sh production')
      console.log('   3. Then restart the application')
      console.log('')
      console.log('⚠️  Server may not function properly until database is updated')
      console.log('💡 To enable auto-update: set NUXT_AUTO_DB_UPDATE=true')
    } else {
      console.log('')
      console.log('🔧 Quick fix for development:')
      console.log('   Run: pnpm db:push')
      console.log('   Or: pnpm db:init')
      console.log('')
    }
  }
})

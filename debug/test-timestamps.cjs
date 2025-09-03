const { PrismaClient } = require('@prisma/client')

async function testTimestamps() {
    const prisma = new PrismaClient()
    
    try {
        console.log('🧪 Testing Prisma timestamp behavior...')
        
        // Get a portfolio for testing
        const portfolio = await prisma.portfolio.findFirst()
        if (!portfolio) {
            console.log('❌ No portfolio found')
            return
        }
        
        console.log(`📁 Using portfolio: ${portfolio.name}`)
        
        // Create a test holding
        const testSymbol = 'TEST_TIMESTAMP'
        
        console.log('🔧 Creating initial holding...')
        const created = await prisma.holding.upsert({
            where: {
                portfolioId_symbol: {
                    portfolioId: portfolio.id,
                    symbol: testSymbol
                }
            },
            update: {
                quantity: 100,
                avgPrice: 50.0,
                currency: 'NOK'
            },
            create: {
                portfolioId: portfolio.id,
                symbol: testSymbol,
                quantity: 100,
                avgPrice: 50.0,
                currency: 'NOK'
            }
        })
        
        console.log('✅ Created holding:')
        console.log(`   ID: ${created.id}`)
        console.log(`   Created: ${created.createdAt}`)
        console.log(`   Updated: ${created.updatedAt}`)
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        console.log('🔄 Updating holding...')
        const updated = await prisma.holding.upsert({
            where: {
                portfolioId_symbol: {
                    portfolioId: portfolio.id,
                    symbol: testSymbol
                }
            },
            update: {
                quantity: 150,
                avgPrice: 55.0
            },
            create: {
                portfolioId: portfolio.id,
                symbol: testSymbol,
                quantity: 150,
                avgPrice: 55.0,
                currency: 'NOK'
            }
        })
        
        console.log('✅ Updated holding:')
        console.log(`   ID: ${updated.id}`)
        console.log(`   Created: ${updated.createdAt}`)
        console.log(`   Updated: ${updated.updatedAt}`)
        console.log(`   Updated timestamp changed: ${updated.updatedAt.getTime() !== created.updatedAt.getTime()}`)
        
        // Cleanup
        await prisma.holding.deleteMany({
            where: {
                portfolioId: portfolio.id,
                symbol: testSymbol
            }
        })
        
        console.log('🧹 Cleaned up test data')
        
    } catch (error) {
        console.error('❌ Test failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

testTimestamps()

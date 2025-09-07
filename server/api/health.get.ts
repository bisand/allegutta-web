// Health check endpoint for container orchestration
export default defineEventHandler(async () => {

  try {
    // Test database connection
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    // Simple query to test database connectivity
    await prisma.$queryRaw`SELECT 1 as health`
    await prisma.$disconnect()

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || 'unknown'
    }
  } catch (error) {
    console.error('Health check failed:', error)
    
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
})

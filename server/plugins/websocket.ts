import type { Server } from 'socket.io'
import type { NitroApp } from 'nitropack'
import { PrismaClient } from '@prisma/client'

let io: Server | null = null
let prisma: PrismaClient | null = null

export default async function websocketPlugin(nitroApp: NitroApp) {
  // Only set up WebSocket in development or when explicitly enabled
  if (!process.env.ENABLE_WEBSOCKETS && process.env.NODE_ENV !== 'development') {
    return
  }

  const { Server } = await import('socket.io')
  prisma = new PrismaClient()
  
  nitroApp.hooks.hook('listen', (server) => {
    io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' ? "http://localhost:3000" : false,
        methods: ["GET", "POST"]
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    })

    io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`)

      // Join portfolio-specific rooms
      socket.on('join-portfolio', (portfolioId: string) => {
        console.log(`Client ${socket.id} joined portfolio room: ${portfolioId}`)
        socket.join(`portfolio-${portfolioId}`)
      })

      // Leave portfolio rooms
      socket.on('leave-portfolio', (portfolioId: string) => {
        console.log(`Client ${socket.id} left portfolio room: ${portfolioId}`)
        socket.leave(`portfolio-${portfolioId}`)
      })

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`)
      })
    })

    console.log('WebSocket server initialized on /socket.io/')
  })

  // Clean up on shutdown
  nitroApp.hooks.hook('close', async () => {
    if (io) {
      io.close()
      console.log('WebSocket server closed')
    }
    if (prisma) {
      await prisma.$disconnect()
    }
  })
}

// Export function to emit portfolio updates
export function emitPortfolioUpdate(portfolioId: string, data: any) {
  if (io) {
    io.to(`portfolio-${portfolioId}`).emit('portfolio-update', data)
    console.log(`Emitted portfolio update to room: portfolio-${portfolioId}`)
  }
}

// Export function to emit market data updates
export function emitMarketDataUpdate(isins: string[], updateData: any) {
  if (io) {
    io.emit('market-data-update', { isins, data: updateData })
    console.log(`Emitted market data update for ${isins.length} instruments`)
  }
}

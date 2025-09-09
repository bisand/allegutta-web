// Standard Prisma Client import
import { PrismaClient } from '@prisma/client'

// Global type declaration for development singleton
declare global {
  var __prisma: PrismaClient | undefined
}

// Create a singleton instance of Prisma Client
const prisma = process.env.NODE_ENV === 'production'
  ? new PrismaClient()
  : globalThis.__prisma || (globalThis.__prisma = new PrismaClient())

export default prisma

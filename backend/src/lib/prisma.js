// Import the client from the generated module
// @ts-ignore - Prisma types are incorrectly resolved
const { PrismaClient } = require('@prisma/client');

// Singleton pattern for Prisma client to prevent connection issues
const globalForPrisma = globalThis;

// Create Prisma Client instance
const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper function to ensure connection is healthy
prisma.ensureConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Prisma connection check failed:', error);
    return false;
  }
};

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma; 
import { PrismaClient } from '@prisma/client';

// Connection pool configuration for production scale (100+ tenants)
const CONNECTION_LIMIT = parseInt(process.env.DATABASE_CONNECTION_LIMIT || '10', 10);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

// Configure connection pool (PostgreSQL-specific)
// These settings are applied via Prisma's raw query capability
// Note: Actual pool limits are set in DATABASE_URL connection string
// Example: DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10"

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

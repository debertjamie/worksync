import { PrismaClient } from '@prisma/client';

// Cache the client on globalThis in non-production so Next.js hot-reload does
// not spawn a new PrismaClient (and a new connection pool) on every edit.
const globalForPrisma = globalThis as unknown as {
  __prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

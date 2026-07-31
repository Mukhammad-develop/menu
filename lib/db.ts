import { PrismaClient } from '@prisma/client';

// PrismaClient singleton — in dev, Next.js hot-reload would otherwise spawn
// a new client (and a new connection pool) on every reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

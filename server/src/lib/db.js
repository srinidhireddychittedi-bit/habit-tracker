import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 * Prevents multiple PrismaClient instances in development
 * when using hot-reload (node --watch).
 *
 * @type {PrismaClient}
 */
const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;

import { PrismaClient } from '@prisma/client';
import { attachPrisma } from '@propad/sdk/server';

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}

attachPrisma(globalForPrisma.prisma);

export const prisma = globalForPrisma.prisma;
export type { Prisma } from '@prisma/client';

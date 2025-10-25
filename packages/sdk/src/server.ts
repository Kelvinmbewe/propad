import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { Prisma };
export type { Prisma };

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export const PrismaClientInitializationError = Prisma.PrismaClientInitializationError;
export const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
export const PrismaClientUnknownRequestError = Prisma.PrismaClientUnknownRequestError;
export const PrismaClientValidationError = Prisma.PrismaClientValidationError;

import { PrismaClient, type Prisma } from '@prisma/client';
import {
  Decimal as PrismaDecimal,
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import type { Decimal as PrismaDecimalType } from '@prisma/client/runtime/library';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type { Prisma };
export const Decimal = PrismaDecimal;
export type Decimal = PrismaDecimalType;
export { PrismaClientInitializationError, PrismaClientKnownRequestError, PrismaClientUnknownRequestError, PrismaClientValidationError };

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __propad_prisma__: PrismaClient | undefined;
}

export const prisma = global.__propad_prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__propad_prisma__ = prisma;
}

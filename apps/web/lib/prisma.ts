import { PrismaClient } from '@prisma/client';
import { attachPrisma } from '@propad/sdk/server';

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const createPrismaFallback = (cause: unknown): PrismaClient => {
  const describeCause = () => (cause instanceof Error ? cause.message : String(cause));
  const createError = () =>
    new Error(
      `Prisma client is not available. Run "pnpm --filter @propad/api run prisma:generate" before building the web app. Original error: ${describeCause()}`
    );
  const asyncThrow = async () => {
    throw createError();
  };
  const syncThrow = () => {
    throw createError();
  };

  const modelProxy: unknown = new Proxy(
    {},
    {
      get() {
        return asyncThrow;
      }
    }
  );

  return new Proxy(
    {
      $connect: asyncThrow,
      $disconnect: asyncThrow,
      $on: syncThrow,
      $transaction: async () => {
        throw createError();
      },
      $use: syncThrow
    },
    {
      get(target, prop) {
        if (prop in target) {
          const value = (target as Record<PropertyKey, unknown>)[prop];
          return typeof value === 'function' ? value.bind(target) : value;
        }

        return modelProxy;
      }
    }
  ) as unknown as PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

if (!globalForPrisma.prisma) {
  let prismaClient: PrismaClient;

  try {
    prismaClient = new PrismaClient();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Falling back to mock Prisma client. Please generate the client for full functionality.', error);
    }

    prismaClient = createPrismaFallback(error);
  }

  globalForPrisma.prisma = prismaClient;
}

attachPrisma(globalForPrisma.prisma);

export const prisma = globalForPrisma.prisma;
export type { Prisma } from '@prisma/client';

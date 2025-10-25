// Re-export Prisma runtime error classes without requiring generated client:
export {
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
  Decimal
} from '@prisma/client/runtime/library';

// A minimal shape for the injected Prisma client (loose to avoid tight coupling)
export type PrismaClientLike = Record<string, any>;

// Global cache for dev/hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __SDK_PRISMA__: PrismaClientLike | undefined;
}

let prismaRef: PrismaClientLike | undefined = globalThis.__SDK_PRISMA__;

/** Attach a Prisma client instance (call this once from the app) */
export function attachPrisma(client: PrismaClientLike) {
  prismaRef = client;
  globalThis.__SDK_PRISMA__ = client;
}

/** Retrieve the injected Prisma client (throws if not attached) */
export function getPrisma(): PrismaClientLike {
  if (!prismaRef) {
    throw new Error(
      '[@propad/sdk] Prisma client not attached. Call attachPrisma(prisma) from your app before using SDK.'
    );
  }
  return prismaRef;
}

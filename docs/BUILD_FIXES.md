# Build Fixes Applied

## Issue
The build was failing with the following error:
```
apps/api build: prisma/migrations/backfill_listing_intent.ts:101:13 - error TS2339: Property 'exit' does not exist on type '{ env: Record<string, string | undefined>; }'.
```

## Root Cause
The migration script `backfill_listing_intent.ts` was being included in the TypeScript build process, and the `process.exit(1)` call was causing a type error during compilation.

## Solution

### 1. Excluded Migration Scripts from Build
Updated `apps/api/tsconfig.json` to exclude migration scripts:
```json
"exclude": [
  "node_modules",
  "prisma/migrations/**/*"
]
```

### 2. Updated Build Config
Updated `apps/api/tsconfig.build.json` to also exclude migrations:
```json
"exclude": [
  "node_modules",
  "test",
  "dist",
  "**/*spec.ts",
  "vitest.config.ts",
  "eslint.config.mjs",
  "prisma/migrations/**/*"
]
```

### 3. Made Process Exit Type-Safe
Updated the migration script to handle `process.exit` more safely:
```typescript
if (typeof process !== 'undefined' && process.exit) {
  process.exit(1);
} else {
  throw error;
}
```

## Verification
✅ API build: `pnpm --filter @propad/api run build` - **SUCCESS**
✅ Web build: `pnpm --filter @propad/web run build` - **SUCCESS**

## Notes
- Migration scripts are now excluded from the build process
- Migration scripts should be run manually with `npx tsx` when needed
- The build process no longer includes migration scripts in the compiled output


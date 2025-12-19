# Fix for Listings Page Error

## Problem
The listings page was showing "We could not load your listings at this time" error. This was caused by existing database records missing the new `listingIntent` field that was added to the schema.

## Solution

### 1. Database Migration Script
A backfill script has been created to update existing properties with the missing `listingIntent` field:
- **Location**: `apps/api/prisma/migrations/backfill_listing_intent.ts`
- **Purpose**: Updates all existing properties to have a `listingIntent` value based on their property type

### 2. Updated Seed Script
The seed script (`scripts/seed.ts`) has been updated to:
- Include `listingIntent` when creating new properties
- Include `areaSqm` for residential properties
- Properly set `status` and `verifiedAt` fields

### 3. Improved Error Handling
- Enhanced error messages in the property management component
- Better error logging and user feedback
- Graceful handling of missing fields in API responses

## How to Apply the Fix

### Step 1: Run the Backfill Script
Run the migration script to update existing properties:

**Windows (PowerShell):**
```powershell
.\scripts\run-backfill.ps1
```

**Linux/Mac:**
```bash
./scripts/run-backfill.sh
```

**Or manually:**
```bash
npx tsx apps/api/prisma/migrations/backfill_listing_intent.ts
```

### Step 2: Verify the Fix
1. Start your API server
2. Navigate to the listings page (`/dashboard/listings`)
3. The page should now load without errors

### Step 3: (Optional) Re-seed Database
If you want to regenerate seed data with the new fields:
```bash
pnpm --filter @propad/api run prisma:seed
```

## What the Backfill Does

The script updates properties based on their type:
- **Sale types** (LAND, PLOT, FARM): Sets `listingIntent` to `FOR_SALE`
- **Rent types** (ROOM, COTTAGE, HOUSE, APARTMENT, TOWNHOUSE): Sets `listingIntent` to `TO_RENT`
- **Flexible types** (Commercial, Warehouse, etc.): Sets `listingIntent` to `TO_RENT` (default)

## Notes

- The script is **safe to run multiple times** - it only updates properties where `listingIntent` is `null`
- **No user data is modified** - only property records are updated
- The script will not break if run on an already-updated database

## Testing

After running the backfill:
1. Check that properties load correctly in the dashboard
2. Verify that new properties created through the UI have `listingIntent` set
3. Ensure the listings page shows all properties without errors


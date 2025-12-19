#!/bin/bash
# Script to run the backfill migration for listingIntent
# This updates existing properties in the database without breaking the system

echo "Running backfill migration for listingIntent..."
echo "This will update existing properties with missing listingIntent values."

# Check if we're in the right directory
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "Error: Please run this script from the project root"
  exit 1
fi

# Run the backfill script
npx tsx apps/api/prisma/migrations/backfill_listing_intent.ts

echo "Backfill completed!"


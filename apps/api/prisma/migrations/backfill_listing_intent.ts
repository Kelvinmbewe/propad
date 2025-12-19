/**
 * Migration script to backfill listingIntent for existing properties
 * This script should be run once to update existing data without breaking the system
 * 
 * Run with: npx tsx apps/api/prisma/migrations/backfill_listing_intent.ts
 * 
 * Make sure DATABASE_URL is set in your environment or .env file
 * For local development: postgresql://user:password@localhost:5432/propad?schema=public
 */

import { PrismaClient, PropertyType, ListingIntent } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file if it exists
// Try multiple possible locations
const envPaths = [
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/api/.env'),
];

for (const envPath of envPaths) {
  try {
    config({ path: envPath });
    if (process.env.DATABASE_URL) {
      console.log(`Loaded DATABASE_URL from ${envPath}`);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

// Check if DATABASE_URL is set and warn if it looks like Docker
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  console.error('Please set it in your .env file or environment:');
  console.error('  DATABASE_URL=postgresql://user:password@localhost:5432/propad?schema=public');
  process.exit(1);
}

if (dbUrl.includes('postgres:5432') || dbUrl.includes('@postgres:')) {
  console.error('ERROR: DATABASE_URL appears to be configured for Docker (postgres:5432)');
  console.error('This script needs to run against your local database.');
  console.error('');
  console.error('Options:');
  console.error('1. Set DATABASE_URL in your environment before running:');
  console.error('   $env:DATABASE_URL="postgresql://user:password@localhost:5432/propad?schema=public"');
  console.error('   .\\scripts\\run-backfill.ps1');
  console.error('');
  console.error('2. Or run the script with an explicit DATABASE_URL:');
  console.error('   $env:DATABASE_URL="postgresql://user:password@localhost:5432/propad?schema=public"; npx tsx apps/api/prisma/migrations/backfill_listing_intent.ts');
  console.error('');
  console.error('3. Or update your .env file to use localhost instead of postgres');
  process.exit(1);
}

const prisma = new PrismaClient();

async function backfillListingIntent() {
  console.log('Starting backfill of listingIntent for existing properties...');
  console.log(`Connecting to database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`); // Hide password

  // Properties that are typically for sale
  const saleTypes: PropertyType[] = [
    PropertyType.LAND,
    PropertyType.PLOT,
    PropertyType.FARM,
  ];

  // Properties that are typically for rent
  const rentTypes: PropertyType[] = [
    PropertyType.ROOM,
    PropertyType.COTTAGE,
    PropertyType.HOUSE,
    PropertyType.APARTMENT,
    PropertyType.TOWNHOUSE,
  ];

  // Properties that can be either (default to rent)
  const flexibleTypes: PropertyType[] = [
    PropertyType.COMMERCIAL_OFFICE,
    PropertyType.COMMERCIAL_RETAIL,
    PropertyType.COMMERCIAL_INDUSTRIAL,
    PropertyType.WAREHOUSE,
    PropertyType.MIXED_USE,
    PropertyType.OTHER,
  ];

  try {
    // Update properties with sale types
    const saleResult = await prisma.property.updateMany({
      where: {
        listingIntent: null,
        type: { in: saleTypes },
      },
      data: {
        listingIntent: ListingIntent.FOR_SALE,
      },
    });
    console.log(`Updated ${saleResult.count} properties with FOR_SALE intent (sale types)`);

    // Update properties with rent types
    const rentResult = await prisma.property.updateMany({
      where: {
        listingIntent: null,
        type: { in: rentTypes },
      },
      data: {
        listingIntent: ListingIntent.TO_RENT,
      },
    });
    console.log(`Updated ${rentResult.count} properties with TO_RENT intent (rent types)`);

    // Update flexible types (default to rent)
    const flexibleResult = await prisma.property.updateMany({
      where: {
        listingIntent: null,
        type: { in: flexibleTypes },
      },
      data: {
        listingIntent: ListingIntent.TO_RENT,
      },
    });
    console.log(`Updated ${flexibleResult.count} properties with TO_RENT intent (flexible types)`);

    // Count remaining nulls
    const remainingNulls = await prisma.property.count({
      where: {
        listingIntent: null,
      },
    });

    if (remainingNulls > 0) {
      console.log(`Warning: ${remainingNulls} properties still have null listingIntent`);
    }

    console.log('Backfill completed successfully!');
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillListingIntent()
  .catch((error) => {
    console.error('Migration failed:', error);
    // Use a type-safe exit
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    } else {
      throw error;
    }
  });


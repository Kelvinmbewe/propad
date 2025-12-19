/**
 * Migration script to backfill listingIntent for existing properties
 * This script should be run once to update existing data without breaking the system
 * 
 * Run with: npx tsx apps/api/prisma/migrations/backfill_listing_intent.ts
 */

import { PrismaClient, PropertyType, ListingIntent } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillListingIntent() {
  console.log('Starting backfill of listingIntent for existing properties...');

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


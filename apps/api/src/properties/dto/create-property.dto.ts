import {
  Currency,
  PropertyAvailability,
  PropertyFurnishing,
  PropertyType
} from '@prisma/client';
import {
  PropertyTypeEnum,
  PropertyFurnishingEnum,
  PropertyAvailabilityEnum,
  CurrencyEnum,
  PowerPhaseEnum,
  PowerPhase
} from '@propad/sdk';
import { z } from 'zod';

const commercialFieldsSchema = z
  .object({
    floorAreaSqm: z.number().positive().max(1_000_000).optional(),
    lotSizeSqm: z.number().positive().max(10_000_000).optional(),
    parkingBays: z.number().int().min(0).max(5_000).optional(),
    powerPhase: z.enum([PowerPhaseEnum.SINGLE, PowerPhaseEnum.THREE] as [string, ...string[]]).optional(),
    loadingBay: z.boolean().optional(),
    zoning: z.string().min(1).max(100).optional(),
    complianceDocsUrl: z.string().url().optional()
  })
  .strict();

// Helper to normalize optional CUID fields (convert empty strings to undefined)
const optionalCuid = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '') ? undefined : val,
  z.string().cuid().optional()
);

// Safe enum preprocessing helper - only preprocesses values, doesn't use generics with z.nativeEnum
function preprocessEnumValue<E extends Record<string, string | number>>(enumObj: E) {
  return (val: unknown) => {
    if (typeof val === 'string') {
      // Try direct enum key lookup
      if (val in enumObj) {
        return enumObj[val as keyof E];
      }
      // Try case-insensitive lookup
      const upperVal = val.toUpperCase();
      const enumKey = Object.keys(enumObj).find(k => k.toUpperCase() === upperVal);
      if (enumKey) {
        return enumObj[enumKey as keyof E];
      }
    }
    return val;
  };
}

const basePropertySchema = z.object({
  title: z.string().min(1).max(200),
  landlordId: optionalCuid,
  agentOwnerId: optionalCuid,
  type: z.preprocess(
    preprocessEnumValue(PropertyTypeEnum),
    z.enum([
      PropertyTypeEnum.ROOM,
      PropertyTypeEnum.COTTAGE,
      PropertyTypeEnum.HOUSE,
      PropertyTypeEnum.APARTMENT,
      PropertyTypeEnum.TOWNHOUSE,
      PropertyTypeEnum.PLOT,
      PropertyTypeEnum.LAND,
      PropertyTypeEnum.COMMERCIAL_OFFICE,
      PropertyTypeEnum.COMMERCIAL_RETAIL,
      PropertyTypeEnum.COMMERCIAL_INDUSTRIAL,
      PropertyTypeEnum.WAREHOUSE,
      PropertyTypeEnum.FARM,
      PropertyTypeEnum.MIXED_USE,
      PropertyTypeEnum.OTHER
    ] as [string, ...string[]])
  ),
  listingIntent: z.preprocess(
    preprocessEnumValue({ FOR_SALE: 'FOR_SALE', TO_RENT: 'TO_RENT' }),
    z.enum(['FOR_SALE', 'TO_RENT'])
  ).optional(),
  currency: z.preprocess(
    preprocessEnumValue(CurrencyEnum),
    z.enum([CurrencyEnum.USD, CurrencyEnum.ZWG] as [string, ...string[]])
  ),
  price: z.number().positive(),
  countryId: optionalCuid,
  provinceId: optionalCuid,
  cityId: optionalCuid,
  suburbId: optionalCuid,
  pendingGeoId: optionalCuid,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  areaSqm: z.number().positive().max(1_000_000).optional(),
  amenities: z.array(z.string().min(1)).max(50).optional(),
  description: z.string().max(5000).optional(),
  furnishing: z.preprocess(
    preprocessEnumValue(PropertyFurnishingEnum),
    z.enum([
      PropertyFurnishingEnum.NONE,
      PropertyFurnishingEnum.PARTLY,
      PropertyFurnishingEnum.FULLY
    ] as [string, ...string[]]).default(PropertyFurnishingEnum.NONE)
  ),
  availability: z.preprocess(
    preprocessEnumValue(PropertyAvailabilityEnum),
    z.enum([
      PropertyAvailabilityEnum.IMMEDIATE,
      PropertyAvailabilityEnum.DATE
    ] as [string, ...string[]]).default(PropertyAvailabilityEnum.IMMEDIATE)
  ),
  availableFrom: z.string().datetime().optional(),
  commercialFields: commercialFieldsSchema.optional()
});

const withCreateRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data, ctx) => {
    // For create: countryId OR pendingGeoId is required
    if (!data.countryId && !data.pendingGeoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'countryId is required unless a pendingGeoId is provided',
        path: ['countryId']
      });
    }

    // Location hierarchy checks for create
    if (data.suburbId && !data.cityId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'suburbId requires a cityId',
        path: ['suburbId']
      });
    }

    if (data.cityId && !data.provinceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'cityId requires a provinceId',
        path: ['cityId']
      });
    }

    if (data.provinceId && !data.countryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'provinceId requires a countryId',
        path: ['provinceId']
      });
    }

    if (data.availability === PropertyAvailabilityEnum.DATE && !data.availableFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'availableFrom is required when availability is DATE',
        path: ['availableFrom']
      });
    }
  });

const withUpdateRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data, ctx) => {
    // For update: only validate location hierarchy if location fields are being updated
    const hasLocationUpdate = data.countryId !== undefined ||
      data.provinceId !== undefined ||
      data.cityId !== undefined ||
      data.suburbId !== undefined ||
      data.pendingGeoId !== undefined;

    if (hasLocationUpdate) {
      // If updating location, validate hierarchy only for provided fields
      if (data.suburbId && !data.cityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'suburbId requires a cityId',
          path: ['suburbId']
        });
      }

      if (data.cityId && !data.provinceId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'cityId requires a provinceId',
          path: ['cityId']
        });
      }

      if (data.provinceId && !data.countryId && !data.pendingGeoId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'provinceId requires a countryId or pendingGeoId',
          path: ['provinceId']
        });
      }
    }

    if (data.availability === PropertyAvailabilityEnum.DATE && !data.availableFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'availableFrom is required when availability is DATE',
        path: ['availableFrom']
      });
    }
  });

export const createPropertySchema = withCreateRefinements(basePropertySchema);
export const updatePropertySchema = withUpdateRefinements(basePropertySchema.partial());

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;

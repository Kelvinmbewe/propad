import {
  Currency,
  PropertyAvailability,
  PropertyFurnishing,
  PropertyType
} from '@prisma/client';
import { PowerPhase } from '../../common/enums';
import { z } from 'zod';

const commercialFieldsSchema = z
  .object({
    floorAreaSqm: z.number().positive().max(1_000_000).optional(),
    lotSizeSqm: z.number().positive().max(10_000_000).optional(),
    parkingBays: z.number().int().min(0).max(5_000).optional(),
    powerPhase: z.nativeEnum(PowerPhase).optional(),
    loadingBay: z.boolean().optional(),
    zoning: z.string().min(1).max(100).optional(),
    complianceDocsUrl: z.string().url().optional()
  })
  .strict();

const basePropertySchema = z.object({
  landlordId: z.string().cuid().optional(),
  agentOwnerId: z.string().cuid().optional(),
  type: z.nativeEnum(PropertyType),
  currency: z.nativeEnum(Currency),
  price: z.number().positive(),
  countryId: z.string().cuid().optional(),
  provinceId: z.string().cuid().optional(),
  cityId: z.string().cuid().optional(),
  suburbId: z.string().cuid().optional(),
  pendingGeoId: z.string().cuid().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  amenities: z.array(z.string().min(1)).max(50).optional(),
  description: z.string().max(5000).optional(),
  furnishing: z.nativeEnum(PropertyFurnishing).default(PropertyFurnishing.NONE),
  availability: z.nativeEnum(PropertyAvailability).default(PropertyAvailability.IMMEDIATE),
  availableFrom: z.string().datetime().optional(),
  commercialFields: commercialFieldsSchema.optional()
});

const withPropertyRefinements = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data, ctx) => {
    if (!data.countryId && !data.pendingGeoId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'countryId is required unless a pendingGeoId is provided',
        path: ['countryId']
      });
    }

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

    if (data.availability === PropertyAvailability.DATE && !data.availableFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'availableFrom is required when availability is DATE',
        path: ['availableFrom']
      });
    }
  });

export const createPropertySchema = withPropertyRefinements(basePropertySchema);
export const updatePropertySchema = withPropertyRefinements(basePropertySchema.partial());

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;

import {
  Currency,
  PowerPhase,
  PropertyAvailability,
  PropertyFurnishing,
  PropertyType
} from '@prisma/client';
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

export const createPropertySchema = z.object({
  landlordId: z.string().cuid().optional(),
  agentOwnerId: z.string().cuid().optional(),
  type: z.nativeEnum(PropertyType),
  currency: z.nativeEnum(Currency),
  price: z.number().positive(),
  city: z.string().min(2).optional(),
  suburb: z.string().min(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  amenities: z.array(z.string().min(1)).max(50).optional(),
  description: z.string().max(5000).optional(),
  furnishing: z.nativeEnum(PropertyFurnishing).default(PropertyFurnishing.NONE),
  availability: z.nativeEnum(PropertyAvailability).default(PropertyAvailability.IMMEDIATE),
  availableFrom: z.string().datetime().optional(),
  commercialFields: commercialFieldsSchema.optional()
})
.superRefine((data, ctx) => {
  if (data.availability === PropertyAvailability.DATE && !data.availableFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'availableFrom is required when availability is DATE',
      path: ['availableFrom']
    });
  }
});

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;

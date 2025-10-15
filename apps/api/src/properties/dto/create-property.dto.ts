import { Currency, PropertyType } from '@prisma/client';
import { z } from 'zod';

export const createPropertySchema = z.object({
  landlordId: z.string().cuid().optional(),
  agentOwnerId: z.string().cuid().optional(),
  type: z.nativeEnum(PropertyType),
  currency: z.nativeEnum(Currency),
  price: z.number().positive(),
  city: z.string().min(2),
  suburb: z.string().min(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  amenities: z.array(z.string().min(1)).max(50).optional(),
  description: z.string().max(5000).optional()
});

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;

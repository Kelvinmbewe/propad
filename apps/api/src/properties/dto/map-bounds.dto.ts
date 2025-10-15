import { PropertyType } from '@prisma/client';
import { z } from 'zod';

export const mapBoundsSchema = z.object({
  northEastLat: z.number().min(-90).max(90),
  northEastLng: z.number().min(-180).max(180),
  southWestLat: z.number().min(-90).max(90),
  southWestLng: z.number().min(-180).max(180),
  type: z.nativeEnum(PropertyType).optional()
});

export type MapBoundsDto = z.infer<typeof mapBoundsSchema>;

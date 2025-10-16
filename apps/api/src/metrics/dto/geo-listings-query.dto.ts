import { z } from 'zod';

export const geoListingsQuerySchema = z.object({
  city: z.string().min(1, 'city is required')
});

export type GeoListingsQueryDto = z.infer<typeof geoListingsQuerySchema>;

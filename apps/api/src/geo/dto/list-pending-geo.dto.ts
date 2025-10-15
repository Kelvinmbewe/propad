import { GeoLevel, PendingGeoStatus } from '@prisma/client';
import { z } from 'zod';

export const listPendingGeoSchema = z.object({
  level: z.nativeEnum(GeoLevel).optional(),
  status: z.nativeEnum(PendingGeoStatus).optional(),
  search: z.string().trim().optional()
});

export type ListPendingGeoDto = z.infer<typeof listPendingGeoSchema>;

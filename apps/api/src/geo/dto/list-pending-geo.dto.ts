import { GeoLevel, PendingGeoStatus } from '@prisma/client';
import { GeoLevelEnum } from '@propad/sdk';
import { z } from 'zod';

export const listPendingGeoSchema = z.object({
  level: z.enum([
    GeoLevelEnum.COUNTRY,
    GeoLevelEnum.PROVINCE,
    GeoLevelEnum.CITY,
    GeoLevelEnum.SUBURB
  ] as [string, ...string[]]).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'] as [string, ...string[]]).optional(),
  search: z.string().trim().optional()
});

export type ListPendingGeoDto = z.infer<typeof listPendingGeoSchema>;

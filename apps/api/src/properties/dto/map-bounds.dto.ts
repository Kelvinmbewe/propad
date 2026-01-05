import { PropertyType } from '@prisma/client';
import { PropertyTypeEnum } from '../../common/runtime-enums';
import { z } from 'zod';

export const mapBoundsSchema = z.object({
  northEastLat: z.number().min(-90).max(90),
  northEastLng: z.number().min(-180).max(180),
  southWestLat: z.number().min(-90).max(90),
  southWestLng: z.number().min(-180).max(180),
  type: z.enum([
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
  ] as [string, ...string[]]).optional()
});

export type MapBoundsDto = z.infer<typeof mapBoundsSchema>;

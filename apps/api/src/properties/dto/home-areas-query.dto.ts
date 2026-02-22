import { z } from "zod";
import { ListingIntent } from "@prisma/client";

export const homeAreasQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
  city: z.string().optional(),
  limitCities: z.coerce.number().min(1).max(12).optional(),
  limitSuburbs: z.coerce.number().min(1).max(12).optional(),
  intent: z.nativeEnum(ListingIntent).optional(),
});

export type HomeAreasQueryDto = z.infer<typeof homeAreasQuerySchema>;

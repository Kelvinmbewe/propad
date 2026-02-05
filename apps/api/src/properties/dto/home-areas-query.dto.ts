import { z } from "zod";

export const homeAreasQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(80).optional(),
  city: z.string().optional(),
  limitCities: z.coerce.number().min(1).max(12).optional(),
  limitSuburbs: z.coerce.number().min(1).max(12).optional(),
});

export type HomeAreasQueryDto = z.infer<typeof homeAreasQuerySchema>;

import { z } from "zod";

export const homeCountsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(80).optional(),
});

export type HomeCountsQueryDto = z.infer<typeof homeCountsQuerySchema>;

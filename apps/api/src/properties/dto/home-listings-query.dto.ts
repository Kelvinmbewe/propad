import { ListingIntent } from "@prisma/client";
import { z } from "zod";

export const homeListingsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(1).max(500).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  intent: z.nativeEnum(ListingIntent).optional(),
});

export type HomeListingsQueryDto = z.infer<typeof homeListingsQuerySchema>;

import { z } from "zod";

export const createSavedSearchSchema = z.object({
  name: z.string().optional(),
  intent: z.string().optional(),
  locationLabel: z.string().optional(),
  locationId: z.string().optional().nullable(),
  locationLevel: z.string().optional().nullable(),
  propertyType: z.string().optional(),
  priceRange: z.string().optional(),
  verifiedOnly: z.boolean().optional(),
  minTrust: z.number().optional(),
  queryJson: z.record(z.any()),
});

export type CreateSavedSearchDto = z.infer<typeof createSavedSearchSchema>;

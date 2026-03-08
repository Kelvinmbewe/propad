import { z } from "zod";

export const ratingQuerySchema = z
  .object({
    propertyId: z.string().cuid().optional(),
    leaseId: z.string().cuid().optional(),
    targetType: z.enum(["LISTING", "USER", "COMPANY"]).optional(),
    targetId: z.string().optional(),
    take: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

export type RatingQueryDto = z.infer<typeof ratingQuerySchema>;

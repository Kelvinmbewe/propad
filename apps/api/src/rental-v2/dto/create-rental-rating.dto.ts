import { z } from "zod";

export const createRentalRatingSchema = z
  .object({
    score: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
    rateTarget: z.enum(["PROPERTY", "TENANT"]),
    isAnonymous: z.boolean().optional(),
  })
  .strict();

export type CreateRentalRatingDto = z.infer<typeof createRentalRatingSchema>;

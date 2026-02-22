import { z } from 'zod';

export const submitPropertyRatingSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    type: z.enum(['PREVIOUS_TENANT', 'NEIGHBOR', 'VISITOR', 'EXTERNAL']),
    isAnonymous: z.boolean().optional(),
    tenantMonths: z.number().int().min(0).optional()
  })
  .strict();

export type SubmitPropertyRatingDto = z.infer<typeof submitPropertyRatingSchema>;



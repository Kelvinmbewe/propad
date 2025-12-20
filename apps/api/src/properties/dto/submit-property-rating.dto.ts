import { z } from 'zod';
import { PropertyRatingType } from '@prisma/client';

export const submitPropertyRatingSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    type: z.nativeEnum(PropertyRatingType),
    isAnonymous: z.boolean().optional(),
    tenantMonths: z.number().int().min(0).optional()
  })
  .strict();

export type SubmitPropertyRatingDto = z.infer<typeof submitPropertyRatingSchema>;


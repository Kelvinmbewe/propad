import { Currency } from '@prisma/client';
import { z } from 'zod';

export const createDirectAdSchema = z
  .object({
    advertiserId: z.string().cuid(),
    creativeId: z.string().cuid(),
    placementId: z.string().cuid(),
    name: z.string().min(3),
    startAt: z.coerce.date(),
    endAt: z.coerce.date().optional(),
    totalCents: z.number().int().min(0),
    currency: z.nativeEnum(Currency),
    buyerUserId: z.string().cuid().optional(),
    buyerAgencyId: z.string().cuid().optional(),
    dailyCapImpressions: z.number().int().min(0).optional()
  })
  .refine((value) => value.buyerUserId || value.buyerAgencyId, {
    message: 'buyerUserId or buyerAgencyId is required'
  });

export type CreateDirectAdDto = z.infer<typeof createDirectAdSchema>;

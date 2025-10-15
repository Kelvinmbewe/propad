import { PromoTier } from '@prisma/client';
import { z } from 'zod';

export const createPromoSchema = z.object({
  agentId: z.string().cuid(),
  propertyId: z.string().cuid(),
  tier: z.nativeEnum(PromoTier),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  usdCents: z.number().int().min(0)
});

export type CreatePromoDto = z.infer<typeof createPromoSchema>;

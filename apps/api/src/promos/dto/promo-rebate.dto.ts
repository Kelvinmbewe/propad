import { z } from 'zod';

export const promoRebateSchema = z.object({
  amountUsdCents: z.number().int().min(0),
  reason: z.string().max(200)
});

export type PromoRebateDto = z.infer<typeof promoRebateSchema>;

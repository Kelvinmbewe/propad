import { PayoutMethod } from '@prisma/client';
import { z } from 'zod';

export const requestPayoutSchema = z.object({
  agentId: z.string().cuid(),
  amountUsdCents: z.number().int().min(1000),
  method: z.nativeEnum(PayoutMethod)
});

export type RequestPayoutDto = z.infer<typeof requestPayoutSchema>;

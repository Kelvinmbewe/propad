import { PayoutMethod } from '@prisma/client';
import { z } from 'zod';

export const requestPayoutSchema = z.object({
  walletId: z.string().cuid(),
  amountCents: z.number().int().positive(),
  method: z
    .nativeEnum(PayoutMethod)
    .refine((value) => value !== PayoutMethod.WALLET, 'Unsupported payout method'),
  payoutAccountId: z.string().cuid(),
  scheduledFor: z.coerce.date().optional()
});

export type RequestPayoutDto = z.infer<typeof requestPayoutSchema>;

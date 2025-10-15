import { PayoutMethod } from '@prisma/client';
import { z } from 'zod';

const baseAccountSchema = {
  displayName: z.string().min(3).max(80)
};

export const createPayoutAccountSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(PayoutMethod.ECOCASH),
    ...baseAccountSchema,
    details: z.object({
      ecocashNumber: z.string().min(7).max(32)
    })
  }),
  z.object({
    type: z.literal(PayoutMethod.BANK),
    ...baseAccountSchema,
    details: z.object({
      bankName: z.string().min(3).max(120),
      accountName: z.string().min(3).max(120),
      accountNumber: z.string().min(5).max(40),
      branch: z.string().min(2).max(120).optional()
    })
  })
]);

export type CreatePayoutAccountDto = z.infer<typeof createPayoutAccountSchema>;

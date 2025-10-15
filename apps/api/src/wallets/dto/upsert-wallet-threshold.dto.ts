import { Currency } from '@prisma/client';
import { z } from 'zod';

export const walletThresholdTypes = ['MIN_PAYOUT', 'MAX_PAYOUT', 'REVIEW_LIMIT'] as const;

export const upsertWalletThresholdSchema = z.object({
  type: z.enum(walletThresholdTypes),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  amountCents: z.number().int().positive(),
  note: z.string().max(200).optional()
});

export type UpsertWalletThresholdDto = z.infer<typeof upsertWalletThresholdSchema>;

import { z } from "zod";

export const advertiserWithdrawalSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().min(3).max(240).optional(),
  referenceId: z.string().optional(),
});

export type AdvertiserWithdrawalDto = z.infer<
  typeof advertiserWithdrawalSchema
>;

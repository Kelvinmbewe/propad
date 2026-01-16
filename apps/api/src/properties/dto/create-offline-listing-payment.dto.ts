import { z } from "zod";

export const createOfflineListingPaymentSchema = z
  .object({
    type: z.enum(["LISTING_FEE", "PROMOTION", "VERIFICATION", "AGENT_FEE"]),
    amount: z.number().positive(),
    currency: z.enum(["USD", "ZWG"]).default("USD"),
    method: z.string().min(2),
    reference: z.string().max(120).optional(),
    proofUrl: z.string().url().optional(),
    notes: z.string().max(240).optional(),
    paidAt: z.coerce.date().optional(),
  })
  .strict();

export type CreateOfflineListingPaymentDto = z.infer<
  typeof createOfflineListingPaymentSchema
>;

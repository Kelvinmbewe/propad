import { z } from "zod";

export const createLeasePaymentSchema = z
  .object({
    amount: z.number().positive(),
    currency: z.enum(["USD", "ZWG"]).default("USD"),
    method: z
      .enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY", "CARD", "OTHER"])
      .default("CASH"),
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    paidAt: z.coerce.date().optional(),
    reference: z.string().trim().max(255).optional(),
    proofUrl: z.string().url().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export type CreateLeasePaymentDto = z.infer<typeof createLeasePaymentSchema>;

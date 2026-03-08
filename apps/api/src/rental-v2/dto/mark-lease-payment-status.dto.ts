import { z } from "zod";

export const markLeasePaymentStatusSchema = z
  .object({
    status: z.enum(["PAID", "FAILED"]),
    paidAt: z.coerce.date().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type MarkLeasePaymentStatusDto = z.infer<
  typeof markLeasePaymentStatusSchema
>;

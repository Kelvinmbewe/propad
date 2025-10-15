import { z } from 'zod';

export const markInvoicePaidSchema = z.object({
  amountCents: z.number().int().positive(),
  notes: z.string().max(200).optional(),
  paidAt: z.coerce.date().optional()
});

export type MarkInvoicePaidDto = z.infer<typeof markInvoicePaidSchema>;

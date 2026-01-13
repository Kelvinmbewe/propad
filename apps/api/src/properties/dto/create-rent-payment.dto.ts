import { z } from 'zod';

export const createRentPaymentSchema = z
  .object({
    amount: z.number().positive(),
    currency: z.enum(['USD', 'ZWG']),
    paidAt: z.coerce.date(),
    proofUrl: z.string().url().optional()
  })
  .strict();

export type CreateRentPaymentDto = z.infer<typeof createRentPaymentSchema>;

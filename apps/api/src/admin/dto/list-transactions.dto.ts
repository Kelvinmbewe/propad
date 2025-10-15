import { PaymentGateway, TransactionResult } from '@prisma/client';
import { z } from 'zod';

export const listTransactionsSchema = z.object({
  result: z.nativeEnum(TransactionResult).optional(),
  gateway: z.nativeEnum(PaymentGateway).optional(),
  invoiceId: z.string().cuid().optional()
});

export type ListTransactionsDto = z.infer<typeof listTransactionsSchema>;

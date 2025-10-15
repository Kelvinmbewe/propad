import { InvoiceStatus } from '@prisma/client';
import { z } from 'zod';

export const listInvoicesSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional()
});

export type ListInvoicesDto = z.infer<typeof listInvoicesSchema>;

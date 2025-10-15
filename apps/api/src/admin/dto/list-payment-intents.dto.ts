import { PaymentGateway, PaymentIntentStatus } from '@prisma/client';
import { z } from 'zod';

export const listPaymentIntentsSchema = z.object({
  status: z.nativeEnum(PaymentIntentStatus).optional(),
  gateway: z.nativeEnum(PaymentGateway).optional(),
  invoiceId: z.string().cuid().optional()
});

export type ListPaymentIntentsDto = z.infer<typeof listPaymentIntentsSchema>;

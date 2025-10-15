import { PaymentGateway } from '@prisma/client';
import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  invoiceId: z.string().cuid(),
  gateway: z.nativeEnum(PaymentGateway).default(PaymentGateway.PAYNOW),
  returnUrl: z.string().url().optional()
});

export type CreatePaymentIntentDto = z.infer<typeof createPaymentIntentSchema>;

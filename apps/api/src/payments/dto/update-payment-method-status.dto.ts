import { PaymentMethodStatus } from '@prisma/client';
import { z } from 'zod';

export const updatePaymentMethodStatusSchema = z.object({
  status: z.nativeEnum(PaymentMethodStatus),
  reason: z.string().trim().max(256).optional()
});

export type UpdatePaymentMethodStatusDto = z.infer<typeof updatePaymentMethodStatusSchema>;

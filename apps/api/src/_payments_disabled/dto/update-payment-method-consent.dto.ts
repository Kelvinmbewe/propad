import { z } from 'zod';

export const updatePaymentMethodConsentSchema = z.object({
  consent: z.boolean()
});

export type UpdatePaymentMethodConsentDto = z.infer<typeof updatePaymentMethodConsentSchema>;

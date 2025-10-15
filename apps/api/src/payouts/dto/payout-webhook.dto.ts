import { PayoutStatus } from '@prisma/client';
import { z } from 'zod';

export const payoutWebhookSchema = z.object({
  txRef: z.string().min(6),
  status: z.nativeEnum(PayoutStatus)
});

export type PayoutWebhookDto = z.infer<typeof payoutWebhookSchema>;

import { PayoutStatus } from '@prisma/client';
import { z } from 'zod';

const allowedStatuses = [PayoutStatus.SENT, PayoutStatus.PAID, PayoutStatus.FAILED, PayoutStatus.CANCELLED] as const;

type AllowedStatus = (typeof allowedStatuses)[number];

export const payoutWebhookSchema = z.object({
  txRef: z.string().min(3).max(128),
  status: z.nativeEnum(PayoutStatus).refine((status): status is AllowedStatus => allowedStatuses.includes(status as AllowedStatus), {
    message: 'Unsupported payout status update'
  }),
  failureReason: z.string().max(256).optional()
});

export type PayoutWebhookDto = z.infer<typeof payoutWebhookSchema>;

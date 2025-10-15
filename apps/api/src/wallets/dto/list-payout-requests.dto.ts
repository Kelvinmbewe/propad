import { PayoutStatus } from '@prisma/client';
import { z } from 'zod';

export const listPayoutRequestsSchema = z.object({
  status: z.nativeEnum(PayoutStatus).optional(),
  walletId: z.string().optional()
});

export type ListPayoutRequestsDto = z.infer<typeof listPayoutRequestsSchema>;

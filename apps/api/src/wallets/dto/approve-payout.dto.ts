import { z } from 'zod';

export const approvePayoutSchema = z.object({
  txRef: z.string().min(5).max(64).optional(),
  scheduledFor: z.coerce.date().optional()
});

export type ApprovePayoutDto = z.infer<typeof approvePayoutSchema>;

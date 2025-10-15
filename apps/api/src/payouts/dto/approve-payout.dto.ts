import { z } from 'zod';

export const approvePayoutSchema = z.object({
  txRef: z.string().min(6)
});

export type ApprovePayoutDto = z.infer<typeof approvePayoutSchema>;

import { z } from 'zod';

export const verifyPayoutAccountSchema = z.object({
  verified: z.boolean().default(true)
});

export type VerifyPayoutAccountDto = z.infer<typeof verifyPayoutAccountSchema>;

import { z } from 'zod';

export const manageAmlBlocklistSchema = z.object({
  value: z.string().min(3),
  reason: z.string().max(200).optional()
});

export type ManageAmlBlocklistDto = z.infer<typeof manageAmlBlocklistSchema>;

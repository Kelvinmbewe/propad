import { z } from 'zod';

export const updateInterestStatusSchema = z
  .object({
    status: z.enum(['ACCEPTED', 'REJECTED'])
  })
  .strict();

export type UpdateInterestStatusDto = z.infer<typeof updateInterestStatusSchema>;

import { z } from 'zod';

export const respondViewingSchema = z
  .object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'POSTPONED']),
    notes: z.string().optional()
  })
  .strict();

export type RespondViewingDto = z.infer<typeof respondViewingSchema>;



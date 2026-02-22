import { z } from 'zod';

export const reviewVerificationItemSchema = z.object({
  status: z.enum(['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED']),
  notes: z.string().max(500).optional()
});

export type ReviewVerificationItemDto = z.infer<typeof reviewVerificationItemSchema>;



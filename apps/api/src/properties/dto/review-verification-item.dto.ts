import { z } from 'zod';
import { VerificationItemStatus } from '@prisma/client';

export const reviewVerificationItemSchema = z.object({
  status: z.nativeEnum(VerificationItemStatus),
  notes: z.string().max(500).optional()
});

export type ReviewVerificationItemDto = z.infer<typeof reviewVerificationItemSchema>;


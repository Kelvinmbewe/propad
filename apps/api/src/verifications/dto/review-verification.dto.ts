import { VerificationMethod } from '@prisma/client';
import { z } from 'zod';

export const reviewVerificationSchema = z.object({
  method: z.nativeEnum(VerificationMethod),
  notes: z.string().min(5).max(1000).optional(),
  evidenceUrl: z.string().url().optional()
});

export type ReviewVerificationDto = z.infer<typeof reviewVerificationSchema>;

import { z } from 'zod';

export const submitForVerificationSchema = z.object({
  notes: z.string().max(500).optional(),
  evidenceUrls: z.array(z.string().url()).max(10).optional()
});

export type SubmitForVerificationDto = z.infer<typeof submitForVerificationSchema>;

import { z } from 'zod';

export const linkMediaSchema = z.object({
  url: z.string().url(),
  kind: z.enum(['IMAGE', 'VIDEO']).optional()
});

export type LinkMediaDto = z.infer<typeof linkMediaSchema>;

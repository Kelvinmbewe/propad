import { z } from 'zod';

export const markProcessingSchema = z.object({
  status: z.literal('processing')
});

export type MarkProcessingDto = z.infer<typeof markProcessingSchema>;

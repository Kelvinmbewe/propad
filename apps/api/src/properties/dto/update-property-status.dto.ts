import { z } from 'zod';

export const updatePropertyStatusSchema = z.object({
  status: z.enum(['ARCHIVED', 'DRAFT'])
});

export type UpdatePropertyStatusDto = z.infer<typeof updatePropertyStatusSchema>;

import { z } from 'zod';

export const updateFeatureFlagSchema = z.object({
  key: z.string().min(2),
  enabled: z.boolean(),
  description: z.string().max(200).optional()
});

export type UpdateFeatureFlagDto = z.infer<typeof updateFeatureFlagSchema>;

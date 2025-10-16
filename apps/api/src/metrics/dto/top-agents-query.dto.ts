import { z } from 'zod';

export const topAgentsQuerySchema = z
  .object({
    limit: z.string().optional()
  })
  .transform((value) => {
    const limit = value.limit ? Number(value.limit) : 5;
    if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: 'limit must be between 1 and 50',
          path: ['limit']
        }
      ]);
    }
    return { limit: Math.floor(limit) };
  });

export type TopAgentsQueryDto = z.infer<typeof topAgentsQuerySchema>;

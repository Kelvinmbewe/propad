import { z } from 'zod';

export const assignAgentSchema = z
  .object({
    agentId: z.string().cuid(),
    serviceFeeUsd: z
      .number({ invalid_type_error: 'Service fee must be a number' })
      .min(0, 'Service fee cannot be negative')
      .max(100000, 'Service fee is too large')
      .optional()
  })
  .strict();

export type AssignAgentDto = z.infer<typeof assignAgentSchema>;

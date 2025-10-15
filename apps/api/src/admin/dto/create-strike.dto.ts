import { PolicyStrikeReason } from '@prisma/client';
import { z } from 'zod';

export const createStrikeSchema = z.object({
  agentId: z.string().cuid(),
  reason: z.nativeEnum(PolicyStrikeReason),
  severity: z.number().int().min(1).max(5),
  notes: z.string().max(500).optional()
});

export type CreateStrikeDto = z.infer<typeof createStrikeSchema>;

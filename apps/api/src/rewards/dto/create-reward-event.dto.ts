import { RewardEventType } from '@prisma/client';
import { z } from 'zod';

export const createRewardEventSchema = z.object({
  agentId: z.string().cuid(),
  type: z.nativeEnum(RewardEventType),
  points: z.number().int().min(0),
  usdCents: z.number().int().min(0),
  refId: z.string().optional()
});

export type CreateRewardEventDto = z.infer<typeof createRewardEventSchema>;

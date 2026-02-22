import { z } from 'zod';

export const updateCampaignSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    budgetCents: z.number().int().positive().optional(),
    dailyCapCents: z.number().int().positive().optional(),
    dailyCapImpressions: z.number().int().positive().optional(),
    endAt: z.string().datetime().optional().nullable(),
    cpmUsdCents: z.number().int().nonnegative().optional(),
    cpcUsdCents: z.number().int().nonnegative().optional(),
    targetingJson: z.record(z.unknown()).optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED']).optional(),
});

export type UpdateCampaignDto = z.infer<typeof updateCampaignSchema>;

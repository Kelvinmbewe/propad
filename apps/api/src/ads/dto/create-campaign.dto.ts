import { z } from 'zod';

export const createCampaignSchema = z.object({
    name: z.string().min(1).max(100),
    type: z.enum(['PROPERTY_BOOST', 'BANNER', 'SEARCH_SPONSOR']),
    targetPropertyId: z.string().optional(),
    budgetCents: z.number().int().positive().optional(),
    dailyCapCents: z.number().int().positive().optional(),
    dailyCapImpressions: z.number().int().positive().optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime().optional(),
    cpmUsdCents: z.number().int().nonnegative().optional(),
    cpcUsdCents: z.number().int().nonnegative().optional(),
    targetingJson: z.record(z.unknown()).optional(),
});

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;

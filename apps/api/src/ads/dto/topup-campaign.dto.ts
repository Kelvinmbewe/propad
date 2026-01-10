import { z } from 'zod';

export const topupCampaignSchema = z.object({
    amountCents: z.number().int().positive(),
});

export type TopupCampaignDto = z.infer<typeof topupCampaignSchema>;

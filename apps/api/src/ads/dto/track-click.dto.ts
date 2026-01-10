import { z } from 'zod';

export const trackClickSchema = z.object({
    campaignId: z.string(),
    flightId: z.string().optional(),
    placementId: z.string().optional(),
    propertyId: z.string().optional(),
    sessionId: z.string(),
    clickUrl: z.string().optional(),
});

export type TrackClickDto = z.infer<typeof trackClickSchema>;

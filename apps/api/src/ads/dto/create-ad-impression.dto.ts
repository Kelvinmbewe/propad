import { z } from 'zod';

export const createAdImpressionSchema = z.object({
  campaignId: z.string(),
  flightId: z.string().optional(),
  placementId: z.string().optional(),
  propertyId: z.string().optional(),
  userId: z.string().optional(),
  route: z.string().max(255),
  source: z.string().max(120).optional(),
  sessionId: z.string().max(64),
});

export type CreateAdImpressionDto = z.infer<typeof createAdImpressionSchema>;

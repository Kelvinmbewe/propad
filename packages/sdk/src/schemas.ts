import { z } from 'zod';

export const DashboardMetricsSchema = z.object({
  activeListings: z.number(),
  pendingVerifications: z.number(),
  rewardPoolUsd: z.number()
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

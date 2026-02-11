import { z } from "zod";

export const homeLocationEventSchema = z.object({
  type: z.enum(["SEARCH", "VIEW_LISTING", "VIEW_AGENT", "VIEW_AGENCY"]),
  locationId: z.string().optional(),
  listingId: z.string().optional(),
  agentId: z.string().optional(),
  agencyId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type HomeLocationEventDto = z.infer<typeof homeLocationEventSchema>;

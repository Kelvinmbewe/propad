import { z } from "zod";

export const endLeaseSchema = z
  .object({
    republish: z.boolean().optional().default(false),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export type EndLeaseDto = z.infer<typeof endLeaseSchema>;

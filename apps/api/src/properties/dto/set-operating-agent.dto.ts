import { z } from "zod";

export const setOperatingAgentSchema = z
  .object({
    assignedAgentId: z.string().cuid().nullable(),
  })
  .strict();

export type SetOperatingAgentDto = z.infer<typeof setOperatingAgentSchema>;

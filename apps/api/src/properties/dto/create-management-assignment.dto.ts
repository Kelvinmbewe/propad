import { z } from "zod";

export const createManagementAssignmentSchema = z
  .object({
    managedByType: z.enum(["OWNER", "AGENT", "AGENCY"]),
    managedById: z.string().optional(),
    assignedAgentId: z.string().optional(),
    serviceFeeUsd: z
      .number({ invalid_type_error: "Service fee must be a number" })
      .min(0, "Service fee cannot be negative")
      .max(100000, "Service fee is too large")
      .optional(),
    landlordPaysFee: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type CreateManagementAssignmentDto = z.infer<
  typeof createManagementAssignmentSchema
>;

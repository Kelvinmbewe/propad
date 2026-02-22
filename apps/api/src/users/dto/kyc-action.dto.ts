import { z } from "zod";

export const userKycActionSchema = z.object({
  action: z.enum(["approve", "reject", "request_info", "suspend"]),
  notes: z.string().max(500).optional(),
});

export type UserKycActionDto = z.infer<typeof userKycActionSchema>;

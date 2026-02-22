import { z } from "zod";

export const updateAdminUserStatusSchema = z.object({
  status: z.string().min(2).max(32),
  reason: z.string().min(3).max(256).optional(),
});

export type UpdateAdminUserStatusDto = z.infer<
  typeof updateAdminUserStatusSchema
>;

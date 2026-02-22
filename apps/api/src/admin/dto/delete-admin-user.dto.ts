import { z } from "zod";

export const deleteAdminUserSchema = z.object({
  reason: z.string().min(3).max(256).optional(),
});

export type DeleteAdminUserDto = z.infer<typeof deleteAdminUserSchema>;

import { z } from "zod";
import { Role } from "@propad/config";

export const updateAdminUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(120).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.string().min(2).max(32).optional(),
  password: z.string().min(8).max(128).optional(),
});

export type UpdateAdminUserDto = z.infer<typeof updateAdminUserSchema>;

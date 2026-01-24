import { z } from "zod";
import { Role } from "@propad/config";

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120).optional(),
  role: z.nativeEnum(Role).optional(),
  password: z.string().min(8).max(128),
  status: z.string().min(2).max(32).optional(),
});

export type CreateAdminUserDto = z.infer<typeof createAdminUserSchema>;

import { z } from "zod";

export const createAdminAgencySchema = z.object({
  name: z.string().min(2).max(150),
  ownerEmail: z.string().email().optional(),
});

export type CreateAdminAgencyDto = z.infer<typeof createAdminAgencySchema>;

import { z } from "zod";

export const updateAgencyProfileSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).max(32).optional(),
  address: z.string().min(3).max(160).optional(),
  registrationNumber: z.string().min(3).max(64).optional(),
  directorsJson: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        idNumber: z.string().min(3).max(64).optional(),
      }),
    )
    .optional(),
  bio: z.string().max(500).optional(),
});

export type UpdateAgencyProfileDto = z.infer<typeof updateAgencyProfileSchema>;

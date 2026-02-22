import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(32).optional(),
  dateOfBirth: z.string().optional(),
  idNumber: z.string().min(3).max(64).optional(),
  addressLine1: z.string().min(3).max(120).optional(),
  addressCity: z.string().min(2).max(80).optional(),
  addressProvince: z.string().min(2).max(80).optional(),
  addressCountry: z.string().min(2).max(80).optional(),
  location: z.string().min(2).max(120).optional(),
});

export type UpdateUserProfileDto = z.infer<typeof updateUserProfileSchema>;

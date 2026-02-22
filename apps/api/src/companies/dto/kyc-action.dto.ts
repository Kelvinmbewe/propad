import { z } from "zod";

export const companyKycActionSchema = z.object({
  action: z.enum(["approve", "reject", "request_info", "suspend"]),
  notes: z.string().max(500).optional(),
});

export type CompanyKycActionDto = z.infer<typeof companyKycActionSchema>;

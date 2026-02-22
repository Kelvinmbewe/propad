import { KycIdType } from "@prisma/client";
import { z } from "zod";

export const submitKycSchema = z.object({
  idType: z.enum(["NATIONAL_ID", "PASSPORT", "CERT_OF_INC"]),
  idNumber: z.string().min(3).max(64),
  idExpiryDate: z.string().optional(),
  docUrls: z.array(z.string().url()).min(1),
  docTypes: z.array(z.string()).optional(),
  notes: z.string().max(256).optional(),
});

export type SubmitKycDto = z.infer<typeof submitKycSchema>;

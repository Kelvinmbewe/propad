import { z } from "zod";

export const documentVerifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  notes: z.string().max(500).optional(),
});

export type DocumentVerifyDto = z.infer<typeof documentVerifySchema>;

import { z } from "zod";

export const createListingInvoiceSchema = z
  .object({
    type: z.enum(["LISTING_FEE", "PROMOTION", "VERIFICATION", "AGENT_FEE"]),
    amount: z.number().positive(),
    currency: z.enum(["USD", "ZWG"]).optional(),
    description: z.string().max(200).optional(),
    purpose: z.enum(["OTHER", "VERIFICATION", "BOOST"]).optional(),
  })
  .strict();

export type CreateListingInvoiceDto = z.infer<
  typeof createListingInvoiceSchema
>;

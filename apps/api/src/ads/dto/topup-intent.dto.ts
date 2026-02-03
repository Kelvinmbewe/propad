import { PaymentGateway } from "@prisma/client";
import { z } from "zod";

export const createTopupIntentSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.enum(["USD", "ZWG"]).optional(),
  gateway: z.nativeEnum(PaymentGateway).default(PaymentGateway.PAYNOW),
  returnUrl: z.string().url().optional(),
});

export type CreateTopupIntentDto = z.infer<typeof createTopupIntentSchema>;

import { PaymentMethodType } from '@prisma/client';
import { z } from 'zod';

export const createPaymentMethodSchema = z
  .object({
    type: z.nativeEnum(PaymentMethodType),
    gatewayRef: z.string().trim().max(128).optional(),
    brand: z.string().trim().max(64).optional(),
    last4: z.string().trim().regex(/^[0-9A-Za-z]{2,4}$/).optional(),
    expMonth: z.number().int().min(1).max(12).optional(),
    expYear: z.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 25).optional(),
    isDefault: z.boolean().optional(),
    recurringConsent: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (data.type === PaymentMethodType.CARD) {
      if (!data.last4) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Card last4 is required for card payments', path: ['last4'] });
      }
      if (!data.expMonth) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Expiry month is required for card payments', path: ['expMonth'] });
      }
      if (!data.expYear) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Expiry year is required for card payments', path: ['expYear'] });
      }
    } else if (!data.gatewayRef) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Account reference is required', path: ['gatewayRef'] });
    }
  });

export type CreatePaymentMethodDto = z.infer<typeof createPaymentMethodSchema>;

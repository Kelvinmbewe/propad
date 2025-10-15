import { Currency } from '@prisma/client';
import { z } from 'zod';

export const createFxRateSchema = z
  .object({
    base: z.nativeEnum(Currency),
    quote: z.nativeEnum(Currency),
    rate: z.number().positive(),
    effectiveDate: z.coerce.date()
  })
  .refine((value) => value.base !== value.quote, {
    message: 'Base and quote currencies must differ',
    path: ['quote']
  });

export type CreateFxRateDto = z.infer<typeof createFxRateSchema>;

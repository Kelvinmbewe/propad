import { z } from 'zod';

export const updateDealConfirmationSchema = z
  .object({
    confirmed: z.boolean()
  })
  .strict();

export type UpdateDealConfirmationDto = z.infer<typeof updateDealConfirmationSchema>;

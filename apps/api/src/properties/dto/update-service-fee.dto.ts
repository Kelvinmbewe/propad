import { z } from 'zod';

export const updateServiceFeeSchema = z
  .object({
    serviceFeeUsd: z
      .number({ invalid_type_error: 'Service fee must be a number' })
      .min(0, 'Service fee cannot be negative')
      .max(100000, 'Service fee is too large')
      .nullable()
  })
  .strict();

export type UpdateServiceFeeDto = z.infer<typeof updateServiceFeeSchema>;


import { KycStatus } from '@prisma/client';
import { z } from 'zod';

export const updateKycStatusSchema = z.object({
  status: z.nativeEnum(KycStatus),
  notes: z.string().max(256).optional()
});

export type UpdateKycStatusDto = z.infer<typeof updateKycStatusSchema>;

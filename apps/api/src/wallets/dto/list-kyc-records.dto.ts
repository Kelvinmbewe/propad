import { KycStatus } from '@prisma/client';
import { z } from 'zod';

export const listKycRecordsSchema = z.object({
  status: z.nativeEnum(KycStatus).optional(),
  ownerId: z.string().optional()
});

export type ListKycRecordsDto = z.infer<typeof listKycRecordsSchema>;

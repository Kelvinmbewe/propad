import { KycIdType } from '@prisma/client';
import { z } from 'zod';

export const submitKycSchema = z.object({
  idType: z.nativeEnum(KycIdType),
  idNumber: z.string().min(3).max(64),
  docUrls: z.array(z.string().url()).min(1),
  notes: z.string().max(256).optional()
});

export type SubmitKycDto = z.infer<typeof submitKycSchema>;

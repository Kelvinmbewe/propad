import { LeadStatus } from '@prisma/client';
import { z } from 'zod';

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus)
});

export type UpdateLeadStatusDto = z.infer<typeof updateLeadStatusSchema>;

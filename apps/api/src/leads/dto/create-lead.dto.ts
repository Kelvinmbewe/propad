import { LeadSource } from '@prisma/client';
import { z } from 'zod';

export const createLeadSchema = z.object({
  propertyId: z.string().cuid(),
  userId: z.string().cuid().optional(),
  source: z.nativeEnum(LeadSource),
  channelRef: z.string().min(2).max(100).optional(),
  contactPhone: z.string().min(7).max(20),
  message: z.string().max(1000).optional()
});

export type CreateLeadDto = z.infer<typeof createLeadSchema>;

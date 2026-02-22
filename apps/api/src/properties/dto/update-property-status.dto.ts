import { z } from 'zod';
import { PropertyStatus } from '@prisma/client';

export const updatePropertyStatusSchema = z.object({
  status: z.enum([
    PropertyStatus.ARCHIVED,
    PropertyStatus.DRAFT,
    PropertyStatus.PUBLISHED
  ])
});

export type UpdatePropertyStatusDto = z.infer<typeof updatePropertyStatusSchema>;


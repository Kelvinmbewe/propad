import { z } from 'zod';
import { ViewingStatus } from '@prisma/client';

export const respondViewingSchema = z
  .object({
    status: z.nativeEnum(ViewingStatus),
    notes: z.string().optional()
  })
  .strict();

export type RespondViewingDto = z.infer<typeof respondViewingSchema>;


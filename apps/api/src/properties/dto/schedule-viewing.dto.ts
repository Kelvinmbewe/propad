import { z } from 'zod';

export const scheduleViewingSchema = z
  .object({
    scheduledAt: z.string().datetime(),
    notes: z.string().optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional()
  })
  .strict();

export type ScheduleViewingDto = z.infer<typeof scheduleViewingSchema>;


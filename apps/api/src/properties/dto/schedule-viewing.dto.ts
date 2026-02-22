import { z } from "zod";

export const scheduleViewingSchema = z
  .object({
    scheduledAt: z.string().datetime().optional(),
    slotId: z.string().min(1).optional(),
    notes: z.string().optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.slotId || value.scheduledAt), {
    message: "Either slotId or scheduledAt is required",
    path: ["scheduledAt"],
  });

export type ScheduleViewingDto = z.infer<typeof scheduleViewingSchema>;

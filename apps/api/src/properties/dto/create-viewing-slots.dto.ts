import { z } from "zod";

const viewingSlotInputSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime().optional(),
    notes: z.string().max(280).optional(),
  })
  .strict();

export const createViewingSlotsSchema = z
  .object({
    slots: z.array(viewingSlotInputSchema).min(1).max(100),
    defaultDurationMinutes: z.number().int().min(15).max(240).optional(),
  })
  .strict();

export type CreateViewingSlotsDto = z.infer<typeof createViewingSlotsSchema>;

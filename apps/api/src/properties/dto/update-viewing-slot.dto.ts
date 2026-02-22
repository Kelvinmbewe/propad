import { z } from "zod";

export const updateViewingSlotSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  })
  .strict()
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    message: "endAt must be after startAt",
    path: ["endAt"],
  });

export type UpdateViewingSlotDto = z.infer<typeof updateViewingSlotSchema>;

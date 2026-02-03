import { z } from "zod";

export const createAdCreativeSchema = z.object({
  type: z.enum(["HTML", "SCRIPT"]).default("HTML"),
  htmlSnippet: z.string().min(1),
  clickUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type CreateAdCreativeDto = z.infer<typeof createAdCreativeSchema>;

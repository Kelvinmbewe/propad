import { z } from 'zod';

export const createSignedUploadSchema = z.object({
  propertyId: z.string().cuid().optional(),
  fileName: z.string().min(3),
  mimeType: z.string().regex(/^[\w.-]+\/[\w.+-]+$/)
});

export type CreateSignedUploadDto = z.infer<typeof createSignedUploadSchema>;

import { z } from 'zod';

export const uploadMediaSchema = z.object({
    propertyId: z.string().cuid(),
    filename: z.string().min(1).max(255),
});

export type UploadMediaDto = z.infer<typeof uploadMediaSchema>;

export const deleteMediaSchema = z.object({
    mediaId: z.string().cuid(),
});

export type DeleteMediaDto = z.infer<typeof deleteMediaSchema>;

import { z } from 'zod';

export const updateVerificationItemSchema = z.object({
  evidenceUrls: z.array(z.string().url()).optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLng: z.number().min(-180).max(180).optional(),
  notes: z.string().max(500).optional()
}).refine(
  (data) => {
    if (data.gpsLat !== undefined || data.gpsLng !== undefined) {
      return data.gpsLat !== undefined && data.gpsLng !== undefined;
    }
    return true;
  },
  { message: 'Both GPS latitude and longitude must be provided together' }
);

export type UpdateVerificationItemDto = z.infer<typeof updateVerificationItemSchema>;


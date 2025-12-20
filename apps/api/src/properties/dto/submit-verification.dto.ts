import { z } from 'zod';

export const submitForVerificationSchema = z.object({
  notes: z.string().max(500).optional(),
  // Proof of ownership
  proofOfOwnershipUrls: z.array(z.string().url()).max(5).optional(),
  // Location confirmation - either GPS or request on-site visit
  locationGpsLat: z.number().min(-90).max(90).optional(),
  locationGpsLng: z.number().min(-180).max(180).optional(),
  requestOnSiteVisit: z.boolean().optional(),
  // Property photos
  propertyPhotoUrls: z.array(z.string().url()).max(20).optional()
}).refine(
  (data) => {
    // Must provide either GPS or request on-site visit for location
    if (data.locationGpsLat !== undefined || data.locationGpsLng !== undefined) {
      return data.locationGpsLat !== undefined && data.locationGpsLng !== undefined;
    }
    return true;
  },
  { message: 'Both GPS latitude and longitude must be provided together' }
);

export type SubmitForVerificationDto = z.infer<typeof submitForVerificationSchema>;

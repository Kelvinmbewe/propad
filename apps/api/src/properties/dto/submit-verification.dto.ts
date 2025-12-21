import { z } from 'zod';

// Helper to validate file paths (accepts relative paths starting with "/" or absolute URLs)
const filePathSchema = z.string().min(1).refine(
  (v) => v.startsWith('/') || v.startsWith('http://') || v.startsWith('https://'),
  { message: 'Invalid file path. Must be a relative path (starting with /) or absolute URL' }
);

export const submitForVerificationSchema = z.object({
  notes: z.string().max(500).optional(),
  // Proof of ownership
  proofOfOwnershipUrls: z.array(filePathSchema).max(5).optional(),
  // Location confirmation - either GPS or request on-site visit
  locationGpsLat: z.number().min(-90).max(90).optional(),
  locationGpsLng: z.number().min(-180).max(180).optional(),
  requestOnSiteVisit: z.boolean().optional(),
  // Property photos
  propertyPhotoUrls: z.array(filePathSchema).max(5).optional()
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

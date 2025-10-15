import { z } from 'zod';

const decimalToNumber = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof value.toNumber === 'function') {
    try {
      return value.toNumber();
    } catch (error) {
      return undefined;
    }
  }
  return value;
}, z.number());

export const DashboardMetricsSchema = z.object({
  activeListings: z.number(),
  pendingVerifications: z.number(),
  rewardPoolUsd: z.number()
});

export const PropertyMediaSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    kind: z.string(),
    hasGps: z.boolean().optional().nullable()
  })
  .passthrough();

export const PropertySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    currency: z.string(),
    price: decimalToNumber,
    city: z.string(),
    suburb: z.string().nullish(),
    bedrooms: z.number().nullish(),
    bathrooms: z.number().nullish(),
    description: z.string().nullish(),
    media: z.array(PropertyMediaSchema).default([])
  })
  .passthrough();

export const AdImpressionSchema = z.object({
  id: z.string(),
  propertyId: z.string().nullish(),
  userId: z.string().nullish(),
  route: z.string(),
  source: z.string().nullish(),
  sessionId: z.string(),
  revenueMicros: z.number(),
  createdAt: z.string()
});

export const ShortLinkSchema = z.object({
  id: z.string(),
  code: z.string(),
  targetUrl: z.string(),
  propertyId: z.string().nullish(),
  utmSource: z.string().nullish(),
  utmMedium: z.string().nullish(),
  utmCampaign: z.string().nullish(),
  utmTerm: z.string().nullish(),
  utmContent: z.string().nullish(),
  clicks: z.number(),
  createdAt: z.string()
});

export const WhatsAppItemSchema = z.object({
  id: z.string(),
  headline: z.string(),
  priceUsd: z.number().nullish(),
  bedrooms: z.number().nullish(),
  bathrooms: z.number().nullish(),
  shortLink: z.string(),
  previewImage: z.string().nullish()
});

export const WhatsAppResponseSchema = z.object({
  reply: z.string(),
  items: z.array(WhatsAppItemSchema)
});

export const FacebookDestinationSchema = z.object({
  endpoint: z.string(),
  status: z.string(),
  id: z.string().optional()
});

export const FacebookPublishResponseSchema = z.object({
  posted: z.boolean(),
  message: z.string(),
  shortLink: z.string(),
  destinations: z.array(FacebookDestinationSchema)
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type AdImpression = z.infer<typeof AdImpressionSchema>;
export type ShortLink = z.infer<typeof ShortLinkSchema>;
export type WhatsAppItem = z.infer<typeof WhatsAppItemSchema>;
export type WhatsAppResponse = z.infer<typeof WhatsAppResponseSchema>;
export type FacebookPublishResponse = z.infer<typeof FacebookPublishResponseSchema>;

import ky from 'ky';
import {
  AdImpressionSchema,
  DashboardMetricsSchema,
  FacebookPublishResponseSchema,
  PropertySchema,
  ShortLinkSchema,
  WhatsAppResponseSchema,
  type AdImpression,
  type DashboardMetrics,
  type FacebookPublishResponse,
  type Property,
  type ShortLink,
  type WhatsAppResponse
} from './schemas';

interface SDKOptions {
  baseUrl: string;
  token?: string;
}

export function createSDK({ baseUrl, token }: SDKOptions) {
  const client = ky.create({
    prefixUrl: baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  return {
    metrics: {
      dashboard: async () =>
        client
          .get('metrics/dashboard')
          .json<DashboardMetrics>()
          .then((data) => DashboardMetricsSchema.parse(data))
    },
    properties: {
      search: async (params: {
        type?: string;
        suburb?: string;
        city?: string;
        priceMin?: number;
        priceMax?: number;
        limit?: number;
      } = {}) =>
        client
          .get('properties/search', {
            searchParams: Object.fromEntries(
              Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
            )
          })
          .json<Property[]>()
          .then((data) => PropertySchema.array().parse(data)),
      get: async (id: string) =>
        client
          .get(`properties/${id}`)
          .json<Property>()
          .then((data) => PropertySchema.parse(data))
    },
    ads: {
      logImpression: async (payload: {
        propertyId?: string;
        userId?: string;
        route: string;
        source?: string;
        sessionId: string;
        revenueMicros?: number;
      }) =>
        client
          .post('ads/impressions', { json: payload })
          .json<AdImpression>()
          .then((data) => AdImpressionSchema.parse(data))
    },
    shortlinks: {
      create: async (payload: {
        targetUrl: string;
        propertyId?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmTerm?: string;
        utmContent?: string;
      }) =>
        client
          .post('shortlinks', { json: payload })
          .json<ShortLink>()
          .then((data) => ShortLinkSchema.parse(data)),
      click: async (code: string, payload: { contactPhone?: string; channelRef?: string } = {}) =>
        client
          .post(`shortlinks/${code}/click`, { json: payload })
          .json<ShortLink>()
          .then((data) => ShortLinkSchema.parse(data))
    },
    whatsapp: {
      inbound: async (payload: { from: string; message: string; locale?: string }) =>
        client
          .post('whatsapp/inbound', { json: payload })
          .json<WhatsAppResponse>()
          .then((data) => WhatsAppResponseSchema.parse(data))
    },
    facebook: {
      publish: async (payload: {
        propertyId: string;
        groupIds?: string[];
        marketplace?: boolean;
        medium?: string;
      }) =>
        client
          .post('facebook/publish', { json: payload })
          .json<FacebookPublishResponse>()
          .then((data) => FacebookPublishResponseSchema.parse(data))
    }
  };
}

export type SDK = ReturnType<typeof createSDK>;

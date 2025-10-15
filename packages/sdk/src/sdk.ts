import ky from 'ky';
import {
  AdImpressionSchema,
  AgentAssignmentSchema,
  AgentSummarySchema,
  DashboardMetricsSchema,
  FacebookPublishResponseSchema,
  PropertyManagementSchema,
  PropertyMessageSchema,
  PropertySchema,
  PropertySearchResultSchema,
  ShortLinkSchema,
  WhatsAppResponseSchema,
  GeoSuburbSchema,
  type AdImpression,
  type AgentAssignment,
  type AgentSummary,
  type DashboardMetrics,
  type GeoSuburb,
  type FacebookPublishResponse,
  type Property,
  type PropertyManagement,
  type PropertyMessage,
  type PropertySearchResult,
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
      listOwned: async () =>
        client
          .get('properties')
          .json<PropertyManagement[]>()
          .then((data) => PropertyManagementSchema.array().parse(data)),
      search: async (params: {
        type?: string;
        suburb?: string;
        city?: string;
        priceMin?: number;
        priceMax?: number;
        limit?: number;
        page?: number;
        bounds?: {
          southWest: { lat: number; lng: number };
          northEast: { lat: number; lng: number };
        };
        filters?: Record<string, unknown>;
      } = {}) => {
        const searchParams = new URLSearchParams();

        const primitiveEntries = Object.entries({
          type: params.type,
          suburb: params.suburb,
          city: params.city,
          priceMin: params.priceMin,
          priceMax: params.priceMax,
          limit: params.limit,
          page: params.page
        }).filter(([, value]) => {
          if (value === undefined || value === null) {
            return false;
          }

          if (typeof value === 'string' && value.trim() === '') {
            return false;
          }

          return true;
        });

        for (const [key, value] of primitiveEntries) {
          searchParams.set(key, String(value));
        }

        if (params.bounds) {
          const { southWest, northEast } = params.bounds;
          searchParams.set(
            'bounds',
            [southWest.lat, southWest.lng, northEast.lat, northEast.lng].map((value) => value.toFixed(6)).join(',')
          );
        }

        if (params.filters && Object.keys(params.filters).length > 0) {
          searchParams.set('filters', JSON.stringify(params.filters));
        }

        return client
          .get('properties/search', { searchParams })
          .json<PropertySearchResult>()
          .then((data) => PropertySearchResultSchema.parse(data));
      },
      get: async (id: string) =>
        client
          .get(`properties/${id}`)
          .json<Property>()
          .then((data) => PropertySchema.parse(data))
      },
      assignAgent: async (
        id: string,
        payload: { agentId: string; serviceFeeUsd?: number }
      ) =>
        client
          .post(`properties/${id}/assign-agent`, { json: payload })
          .json<AgentAssignment>()
          .then((data) => AgentAssignmentSchema.parse(data)),
      updateDealConfirmation: async (id: string, payload: { confirmed: boolean }) =>
        client
          .patch(`properties/${id}/deal-confirmation`, { json: payload })
          .json<PropertyManagement>()
          .then((data) => PropertyManagementSchema.parse(data)),
      listMessages: async (id: string) =>
        client
          .get(`properties/${id}/messages`)
          .json<PropertyMessage[]>()
          .then((data) => PropertyMessageSchema.array().parse(data)),
      sendMessage: async (id: string, payload: { body: string }) =>
        client
          .post(`properties/${id}/messages`, { json: payload })
          .json<PropertyMessage>()
          .then((data) => PropertyMessageSchema.parse(data))
    },
    geo: {
      suburbs: async () =>
        client
          .get('geo/suburbs')
          .json<GeoSuburb[]>()
          .then((data) => GeoSuburbSchema.array().parse(data))
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
    agents: {
      listVerified: async () =>
        client
          .get('properties/agents/verified')
          .json<AgentSummary[]>()
          .then((data) => AgentSummarySchema.array().parse(data))
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

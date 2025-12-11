import ky from 'ky';
import {
  AdImpressionSchema,
  AgentAssignmentSchema,
  AgentSummarySchema,
  AmlBlocklistEntrySchema,
  AdminOverviewMetricsSchema,
  FacebookPublishResponseSchema,
  GeoSearchResultSchema,
  InvoiceSchema,
  KycRecordSchema,
  DailyAdsPointSchema,
  PaymentIntentSchema,
  PendingGeoSchema,
  PropertyManagementSchema,
  PropertyMessageSchema,
  PropertySchema,
  PropertySearchResultSchema,
  PayoutAccountSchema,
  PayoutRequestSchema,
  ShortLinkSchema,
  TopAgentsResponseSchema,
  GeoListingsResponseSchema,
  RewardsEstimateSchema,
  TransactionSchema,
  WalletThresholdSchema,
  WhatsAppResponseSchema,
  GeoSuburbSchema,
  type AdImpression,
  type AgentAssignment,
  type AgentSummary,
  type AmlBlocklistEntry,
  type AdminOverviewMetrics,
  type GeoSearchResult,
  type Invoice,
  type KycRecord,
  type DailyAdsPoint,
  type PaymentIntent,
  type PendingGeo,
  type GeoSuburb,
  type FacebookPublishResponse,
  type TopAgentsResponse,
  type GeoListingsResponse,
  type RewardsEstimate,
  type PayoutAccount,
  type PayoutRequest,
  type Property,
  type PropertyManagement,
  type PropertyMessage,
  type PropertySearchResult,
  type ShortLink,
  type Transaction,
  type WalletThreshold,
  type WhatsAppResponse,
} from './schemas';

interface SDKOptions {
  baseUrl: string;
  token?: string;
}

const createSearchParams = (
  params: Record<string, string | number | boolean | undefined | null>,
) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams;
};

export function createSDK({ baseUrl, token }: SDKOptions) {
  const client = ky.create({
    prefixUrl: baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return {
    metrics: {
      overview: async () =>
        client
          .get('admin/metrics/overview')
          .json<AdminOverviewMetrics>()
          .then((data) => AdminOverviewMetricsSchema.parse(data)),
      dailyAds: async (params: { from: string; to: string }) =>
        client
          .get('admin/metrics/ads/daily', {
            searchParams: createSearchParams(params),
          })
          .json<DailyAdsPoint[]>()
          .then((data) => DailyAdsPointSchema.array().parse(data)),
      topAgents: async (params: { limit?: number } = {}) =>
        client
          .get('admin/metrics/agents/top', {
            searchParams: createSearchParams({ limit: params.limit }),
          })
          .json<TopAgentsResponse>()
          .then((data) => TopAgentsResponseSchema.parse(data)),
      geoListings: async (city: string) =>
        client
          .get('admin/metrics/geo/listings', {
            searchParams: createSearchParams({ city }),
          })
          .json<GeoListingsResponse>()
          .then((data) => GeoListingsResponseSchema.parse(data)),
    },
    properties: {
      listOwned: async () =>
        client
          .get('properties')
          .json<PropertyManagement[]>()
          .then((data) => PropertyManagementSchema.array().parse(data)),
      create: async (payload: unknown) =>
        client
          .post('properties', { json: payload })
          .json<Property>()
          .then((data) => PropertySchema.parse(data)),
      search: async (
        params: {
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
        } = {},
      ) => {
        const searchParams = new URLSearchParams();

        const primitiveEntries = Object.entries({
          type: params.type,
          suburb: params.suburb,
          city: params.city,
          priceMin: params.priceMin,
          priceMax: params.priceMax,
          limit: params.limit,
          page: params.page,
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
            [southWest.lat, southWest.lng, northEast.lat, northEast.lng]
              .map((value) => value.toFixed(6))
              .join(','),
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
          .then((data) => PropertySchema.parse(data)),
      assignAgent: async (
        id: string,
        payload: { agentId: string; serviceFeeUsd?: number },
      ) =>
        client
          .post(`properties/${id}/assign-agent`, { json: payload })
          .json<AgentAssignment>()
          .then((data) => AgentAssignmentSchema.parse(data)),
      updateDealConfirmation: async (
        id: string,
        payload: { confirmed: boolean },
      ) =>
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
          .then((data) => PropertyMessageSchema.parse(data)),
      update: async (id: string, payload: unknown) =>
        client
          .patch(`properties/${id}`, { json: payload })
          .json<Property>()
          .then((data) => PropertySchema.parse(data)),
      delete: async (id: string) =>
        client.delete(`properties/${id}`).json<{ success: boolean }>(),
      uploadMedia: async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return client
          .post(`properties/${id}/media/upload`, { body: formData })
          .json<{ id: string; url: string; kind: string }>();
      },
      listMedia: async (id: string) =>
        client
          .get(`properties/${id}/media`)
          .json<Array<{ id: string; url: string; kind: string }>>(),
      deleteMedia: async (propertyId: string, mediaId: string) =>
        client
          .delete(`properties/${propertyId}/media/${mediaId}`)
          .json<{ success: boolean }>(),
    },
    geo: {
      suburbs: async () =>
        client
          .get('geo/suburbs')
          .json<GeoSuburb[]>()
          .then((data) => GeoSuburbSchema.array().parse(data)),
      listPending: async (
        params: { level?: string; status?: string; search?: string } = {},
      ) =>
        client
          .get('geo/pending', {
            searchParams: createSearchParams({
              level: params.level,
              status: params.status,
              search: params.search,
            }),
          })
          .json<PendingGeo[]>()
          .then((data) => PendingGeoSchema.array().parse(data)),
      approvePending: async (id: string) =>
        client.post(`geo/pending/${id}/approve`).json<unknown>(),
      rejectPending: async (id: string) =>
        client.post(`geo/pending/${id}/reject`).json<unknown>(),
      mergePending: async (id: string, targetId: string) =>
        client
          .post(`geo/pending/${id}/merge`, { json: { targetId } })
          .json<unknown>(),
      search: async (query: string) =>
        client
          .get('geo/search', {
            searchParams: createSearchParams({ q: query }),
          })
          .json<GeoSearchResult[]>()
          .then((data) => GeoSearchResultSchema.array().parse(data)),
      createPending: async (payload: {
        level: 'SUBURB' | 'CITY' | 'PROVINCE';
        proposedName: string;
        parentId?: string;
      }) =>
        client
          .post('geo/pending', { json: payload })
          .json<PendingGeo>()
          .then((data) => PendingGeoSchema.parse(data)),
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
          .then((data) => AdImpressionSchema.parse(data)),
    },
    rewards: {
      estimateMe: async () =>
        client
          .get('rewards/estimate/me')
          .json<RewardsEstimate>()
          .then((data) => RewardsEstimateSchema.parse(data)),
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
      click: async (
        code: string,
        payload: { contactPhone?: string; channelRef?: string } = {},
      ) =>
        client
          .post(`shortlinks/${code}/click`, { json: payload })
          .json<ShortLink>()
          .then((data) => ShortLinkSchema.parse(data)),
    },
    whatsapp: {
      inbound: async (payload: {
        from: string;
        message: string;
        locale?: string;
      }) =>
        client
          .post('whatsapp/inbound', { json: payload })
          .json<WhatsAppResponse>()
          .then((data) => WhatsAppResponseSchema.parse(data)),
    },
    agents: {
      listVerified: async () =>
        client
          .get('properties/agents/verified')
          .json<AgentSummary[]>()
          .then((data) => AgentSummarySchema.array().parse(data)),
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
          .then((data) => FacebookPublishResponseSchema.parse(data)),
    },
    admin: {
      invoices: {
        list: async (params: { status?: string } = {}) =>
          client
            .get('admin/invoices', {
              searchParams: createSearchParams({ status: params.status }),
            })
            .json<Invoice[]>()
            .then((data) => InvoiceSchema.array().parse(data)),
        export: async (params: { status?: string } = {}) =>
          client
            .get('admin/exports/invoices', {
              searchParams: createSearchParams({ status: params.status }),
            })
            .text(),
        markPaid: async (
          id: string,
          payload: {
            amountCents: number;
            notes?: string;
            paidAt: string | Date;
          },
        ) => {
          const json = {
            amountCents: payload.amountCents,
            notes: payload.notes,
            paidAt:
              typeof payload.paidAt === 'string'
                ? payload.paidAt
                : payload.paidAt.toISOString(),
          };

          return client
            .post(`admin/invoices/${id}/mark-paid`, { json })
            .json<Invoice>()
            .then((data) => InvoiceSchema.parse(data));
        },
      },
      paymentIntents: {
        list: async (
          params: {
            status?: string;
            gateway?: string;
            invoiceId?: string;
          } = {},
        ) =>
          client
            .get('admin/payment-intents', {
              searchParams: createSearchParams({
                status: params.status,
                gateway: params.gateway,
                invoiceId: params.invoiceId,
              }),
            })
            .json<PaymentIntent[]>()
            .then((data) => PaymentIntentSchema.array().parse(data)),
        export: async (
          params: {
            status?: string;
            gateway?: string;
            invoiceId?: string;
          } = {},
        ) =>
          client
            .get('admin/exports/payment-intents', {
              searchParams: createSearchParams({
                status: params.status,
                gateway: params.gateway,
                invoiceId: params.invoiceId,
              }),
            })
            .text(),
      },
      transactions: {
        list: async (
          params: {
            result?: string;
            gateway?: string;
            invoiceId?: string;
          } = {},
        ) =>
          client
            .get('admin/transactions', {
              searchParams: createSearchParams({
                result: params.result,
                gateway: params.gateway,
                invoiceId: params.invoiceId,
              }),
            })
            .json<Transaction[]>()
            .then((data) => TransactionSchema.array().parse(data)),
        export: async (
          params: {
            result?: string;
            gateway?: string;
            invoiceId?: string;
          } = {},
        ) =>
          client
            .get('admin/exports/transactions', {
              searchParams: createSearchParams({
                result: params.result,
                gateway: params.gateway,
                invoiceId: params.invoiceId,
              }),
            })
            .text(),
      },
      fxRates: {
        create: async (payload: {
          base: string;
          quote: string;
          rate: number;
          effectiveDate: string | Date;
        }) =>
          client
            .post('admin/fx-rates', {
              json: {
                base: payload.base,
                quote: payload.quote,
                rate: payload.rate,
                effectiveDate:
                  typeof payload.effectiveDate === 'string'
                    ? payload.effectiveDate
                    : payload.effectiveDate.toISOString(),
              },
            })
            .json(),
      },
    },
    wallets: {
      kyc: {
        list: async (params: { status?: string; ownerId?: string } = {}) =>
          client
            .get('wallets/kyc', {
              searchParams: createSearchParams({
                status: params.status,
                ownerId: params.ownerId,
              }),
            })
            .json<KycRecord[]>()
            .then((data) => KycRecordSchema.array().parse(data)),
        updateStatus: async (
          id: string,
          payload: { status: string; notes?: string },
        ) =>
          client
            .post(`wallets/kyc/${id}/status`, { json: payload })
            .json<KycRecord>()
            .then((data) => KycRecordSchema.parse(data)),
      },
      payoutRequests: {
        list: async (params: { status?: string; walletId?: string } = {}) =>
          client
            .get('wallets/payouts', {
              searchParams: createSearchParams({
                status: params.status,
                walletId: params.walletId,
              }),
            })
            .json<PayoutRequest[]>()
            .then((data) => PayoutRequestSchema.array().parse(data)),
        approve: async (
          id: string,
          payload: { txRef?: string; scheduledFor?: string | Date },
        ) =>
          client
            .post(`wallets/payouts/${id}/approve`, {
              json: {
                txRef: payload.txRef,
                scheduledFor:
                  payload.scheduledFor instanceof Date
                    ? payload.scheduledFor.toISOString()
                    : payload.scheduledFor,
              },
            })
            .json<PayoutRequest>()
            .then((data) => PayoutRequestSchema.parse(data)),
      },
      payoutAccounts: {
        list: async (
          params: {
            ownerId?: string;
            ownerType?: string;
            verified?: boolean;
          } = {},
        ) =>
          client
            .get('wallets/payout-accounts', {
              searchParams: createSearchParams({
                ownerId: params.ownerId,
                ownerType: params.ownerType,
                verified: params.verified,
              }),
            })
            .json<PayoutAccount[]>()
            .then((data) => PayoutAccountSchema.array().parse(data)),
        verify: async (id: string, payload: { verified: boolean }) =>
          client
            .post(`wallets/payout-accounts/${id}/verify`, { json: payload })
            .json<PayoutAccount>()
            .then((data) => PayoutAccountSchema.parse(data)),
      },
      amlBlocklist: {
        list: async () =>
          client
            .get('wallets/aml-blocklist')
            .json<AmlBlocklistEntry[]>()
            .then((data) => AmlBlocklistEntrySchema.array().parse(data)),
        add: async (payload: { value: string; reason?: string }) =>
          client
            .post('wallets/aml-blocklist', { json: payload })
            .json<AmlBlocklistEntry>()
            .then((data) => AmlBlocklistEntrySchema.parse(data)),
        remove: async (id: string) =>
          client
            .delete(`wallets/aml-blocklist/${id}`)
            .json<{ success: boolean }>(),
      },
      thresholds: {
        list: async () =>
          client
            .get('wallets/thresholds')
            .json<WalletThreshold[]>()
            .then((data) => WalletThresholdSchema.array().parse(data)),
        upsert: async (payload: {
          type: string;
          currency: string;
          amountCents: number;
          note?: string;
        }) =>
          client
            .post('wallets/thresholds', { json: payload })
            .json<WalletThreshold>()
            .then((data) => WalletThresholdSchema.parse(data)),
      },
    },
  };
}

export type SDK = ReturnType<typeof createSDK>;

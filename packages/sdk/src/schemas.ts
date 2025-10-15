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

const PropertyCommercialFieldsSchema = z
  .object({
    floorAreaSqm: z.number().optional(),
    lotSizeSqm: z.number().optional(),
    parkingBays: z.number().optional(),
    powerPhase: z.string().optional(),
    loadingBay: z.boolean().optional(),
    zoning: z.string().optional(),
    complianceDocsUrl: z.string().optional()
  })
  .strict()
  .partial();

const LocationEntitySchema = z
  .object({
    id: z.string(),
    name: z.string()
  })
  .passthrough();

const CountrySummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    iso2: z.string(),
    phoneCode: z.string()
  })
  .passthrough();

const PropertyLocationSchema = z.object({
  countryId: z.string().nullish(),
  country: CountrySummarySchema.nullish(),
  provinceId: z.string().nullish(),
  province: LocationEntitySchema.nullish(),
  cityId: z.string().nullish(),
  city: LocationEntitySchema.nullish(),
  suburbId: z.string().nullish(),
  suburb: LocationEntitySchema.nullish(),
  pendingGeoId: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish()
});

export const PropertySchema = z
  .object({
    id: z.string(),
    type: z.string(),
    currency: z.string(),
    price: decimalToNumber,
    countryId: z.string().nullish(),
    provinceId: z.string().nullish(),
    cityId: z.string().nullish(),
    suburbId: z.string().nullish(),
    pendingGeoId: z.string().nullish(),
    agencyId: z.string().nullish(),
    location: PropertyLocationSchema,
    lat: z.number().nullish(),
    lng: z.number().nullish(),
    countryName: z.string().nullish(),
    provinceName: z.string().nullish(),
    cityName: z.string().nullish(),
    suburbName: z.string().nullish(),
    bedrooms: z.number().nullish(),
    bathrooms: z.number().nullish(),
    furnishing: z.string(),
    availability: z.string(),
    availableFrom: z.string().nullish(),
    description: z.string().nullish(),
    media: z.array(PropertyMediaSchema).default([]),
    isManaged: z.boolean().default(false),
    commercialFields: PropertyCommercialFieldsSchema.nullish(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
  })
  .passthrough();

export const PropertySearchResultSchema = z.object({
  items: PropertySchema.array(),
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean()
});

export const GeoSuburbSchema = z.object({
  name: z.string(),
  city: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  bbox: z.object({
    northEast: z.object({ lat: z.number(), lng: z.number() }),
    southWest: z.object({ lat: z.number(), lng: z.number() })
  })
});

export const UserSummarySchema = z
  .object({
    id: z.string(),
    name: z.string().nullish(),
    role: z.string()
  })
  .passthrough();

export const AgencySummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    logoUrl: z.string().nullish(),
    status: z.string(),
    kycStatus: z.string().nullish()
  })
  .passthrough();

export const AgencyMemberSchema = z
  .object({
    id: z.string(),
    agencyId: z.string(),
    userId: z.string(),
    role: z.string(),
    joinedAt: z.string(),
    isActive: z.boolean(),
    user: UserSummarySchema.nullish()
  })
  .passthrough();

export const ManagementContractSchema = z
  .object({
    id: z.string(),
    agencyId: z.string(),
    landlordId: z.string(),
    startAt: z.string(),
    endAt: z.string().nullish(),
    scope: z.string(),
    feeType: z.string(),
    feeValue: decimalToNumber,
    notes: z.string().nullish(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .passthrough();

export const AgencySchema = AgencySummarySchema.extend({
  licenseNo: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  members: z.array(AgencyMemberSchema).optional(),
  contracts: z.array(ManagementContractSchema).optional()
});

export const AgentProfileSummarySchema = z.object({
  verifiedListingsCount: z.number(),
  leadsCount: z.number()
});

export const AgentSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  phone: z.string().nullish(),
  agentProfile: AgentProfileSummarySchema.nullish()
});

export const AgentAssignmentSchema = z
  .object({
    id: z.string(),
    propertyId: z.string(),
    landlordId: z.string(),
    agentId: z.string(),
    serviceFeeUsdCents: z.number().nullish(),
    landlordPaysFee: z.boolean(),
    createdAt: z.string(),
    agent: UserSummarySchema.nullish(),
    landlord: UserSummarySchema.nullish()
  })
  .passthrough();

export const PropertyMessageSchema = z
  .object({
    id: z.string(),
    propertyId: z.string(),
    senderId: z.string(),
    recipientId: z.string(),
    body: z.string(),
    createdAt: z.string(),
    readAt: z.string().nullish(),
    sender: UserSummarySchema.nullish(),
    recipient: UserSummarySchema.nullish()
  })
  .passthrough();

export const PropertyManagementSchema = PropertySchema.extend({
  landlordId: z.string().nullish(),
  agentOwnerId: z.string().nullish(),
  dealConfirmedAt: z.string().nullish(),
  assignments: AgentAssignmentSchema.array().optional(),
  landlord: UserSummarySchema.nullish(),
  agentOwner: UserSummarySchema.nullish(),
  agency: AgencySummarySchema.nullish(),
  managementContracts: ManagementContractSchema.array().optional()
});

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
export type AgentSummary = z.infer<typeof AgentSummarySchema>;
export type AgentAssignment = z.infer<typeof AgentAssignmentSchema>;
export type PropertyMessage = z.infer<typeof PropertyMessageSchema>;
export type PropertyManagement = z.infer<typeof PropertyManagementSchema>;
export type UserSummary = z.infer<typeof UserSummarySchema>;
export type Agency = z.infer<typeof AgencySchema>;
export type AgencySummary = z.infer<typeof AgencySummarySchema>;
export type AgencyMember = z.infer<typeof AgencyMemberSchema>;
export type ManagementContract = z.infer<typeof ManagementContractSchema>;
export type PropertySearchResult = z.infer<typeof PropertySearchResultSchema>;
export type GeoSuburb = z.infer<typeof GeoSuburbSchema>;

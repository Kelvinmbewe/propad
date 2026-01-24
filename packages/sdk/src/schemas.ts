import { z } from "zod";

const decimalToNumber = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value === "number") {
    return value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
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
  rewardPoolUsd: z.number(),
});

export const AdminOverviewMetricsSchema = z.object({
  generatedAt: z.string(),
  listings: z.object({
    verified: z.number(),
    pendingVerification: z.number(),
    new7d: z.number(),
    growth7dPct: z.number(),
  }),
  leads: z.object({
    total30d: z.number(),
    qualified30d: z.number(),
    conversionRate30d: z.number(),
  }),
  agents: z.object({
    total: z.number(),
    active30d: z.number(),
    new7d: z.number(),
  }),
  revenue: z.object({
    total30dUsd: z.number(),
    averageDailyUsd: z.number(),
    previous30dUsd: z.number(),
    deltaPct: z.number(),
  }),
  payouts: z.object({
    pendingCount: z.number(),
    pendingUsd: z.number(),
    settled30dUsd: z.number(),
  }),
  traffic: z.object({
    visits30d: z.number(),
    uniqueSessions30d: z.number(),
    impressions30d: z.number(),
    clicks30d: z.number(),
    ctr30d: z.number(),
  }),
});

export const PropertyMediaSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    kind: z.string(),
    hasGps: z.boolean().optional().nullable(),
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
    complianceDocsUrl: z.string().optional(),
  })
  .strict()
  .partial();

const LocationEntitySchema = z
  .object({
    id: z.string(),
    name: z.string(),
  })
  .passthrough();

const CountrySummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    iso2: z.string(),
    phoneCode: z.string(),
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
  pendingGeo: z
    .object({
      id: z.string(),
      proposedName: z.string(),
      level: z.string(),
      status: z.string(),
    })
    .nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
});

export const PropertySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    type: z.string(),
    listingIntent: z.string().nullish(),
    currency: z.string(),
    price: decimalToNumber,
    areaSqm: z.number().nullish(),
    status: z.string().optional(),
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
    amenities: z.array(z.string()).default([]),
    media: z.array(PropertyMediaSchema).default([]),
    isManaged: z.boolean().default(false),
    commercialFields: PropertyCommercialFieldsSchema.nullish(),
    verificationScore: z.number().default(0),
    verificationLevel: z
      .enum(["NONE", "BASIC", "TRUSTED", "VERIFIED"])
      .default("NONE"),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const PropertySearchFacetsSchema = z.object({
  price: z.object({
    min: z.number(),
    max: z.number(),
  }),
  types: z.array(z.object({ type: z.string(), count: z.number() })),
  suburbs: z.array(
    z.object({
      suburbId: z.string(),
      suburbName: z.string().nullish(),
      count: z.number(),
    }),
  ),
});

export const PropertySearchResultSchema = z.object({
  items: PropertySchema.array(),
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  facets: PropertySearchFacetsSchema,
});

export const GeoSuburbSchema = z.object({
  name: z.string(),
  city: z.string(),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  bbox: z.object({
    northEast: z.object({ lat: z.number(), lng: z.number() }),
    southWest: z.object({ lat: z.number(), lng: z.number() }),
  }),
});

export const UserSummarySchema = z
  .object({
    id: z.string(),
    name: z.string().nullish(),
    role: z.string(),
  })
  .passthrough();

export const AgencySummarySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    logoUrl: z.string().nullish(),
    status: z.string(),
    kycStatus: z.string().nullish(),
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
    user: UserSummarySchema.nullish(),
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
    updatedAt: z.string(),
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
  contracts: z.array(ManagementContractSchema).optional(),
});

export const AgentProfileSummarySchema = z.object({
  verifiedListingsCount: z.number(),
  leadsCount: z.number(),
});

export const AgentSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  phone: z.string().nullish(),
  trustScore: z.number().optional(),
  agentProfile: AgentProfileSummarySchema.nullish(),
});

export const DailyAdsPointSchema = z.object({
  date: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  revenueUSD: z.number(),
});

export const TopAgentPerformanceSchema = z.object({
  agentId: z.string(),
  agentName: z.string().nullish(),
  verifiedListings: z.number(),
  validLeads: z.number(),
  monthPoints: z.number(),
  estPayoutUSD: z.number(),
});

export const TopAgentsResponseSchema = z.object({
  generatedAt: z.string(),
  items: TopAgentPerformanceSchema.array(),
  limit: z.number(),
  totalAgents: z.number(),
});

export const GeoListingsResponseSchema = z.object({
  generatedAt: z.string(),
  city: z.object({ id: z.string(), name: z.string(), province: z.string() }),
  suburbs: z.array(
    z.object({
      suburbId: z.string(),
      suburbName: z.string(),
      verifiedListings: z.number(),
      pendingListings: z.number(),
      averagePriceUsd: z.number().nullable(),
      marketSharePct: z.number(),
    }),
  ),
});

export const RewardsEstimateSchema = z.object({
  agentId: z.string(),
  generatedAt: z.string(),
  monthStart: z.string(),
  projectedUsd: z.number(),
  projectedPoints: z.number(),
  events: z.number(),
  walletBalanceUsd: z.number(),
  pendingWalletUsd: z.number(),
  poolUsd: z.number(),
  estimatedShareUsd: z.number(),
  nextPayoutEta: z.string(),
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
    landlord: UserSummarySchema.nullish(),
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
    recipient: UserSummarySchema.nullish(),
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
  managementContracts: ManagementContractSchema.array().optional(),
});

export const AdImpressionSchema = z.object({
  id: z.string(),
  propertyId: z.string().nullish(),
  userId: z.string().nullish(),
  route: z.string(),
  source: z.string().nullish(),
  sessionId: z.string(),
  revenueMicros: z.number(),
  createdAt: z.string(),
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
  createdAt: z.string(),
});

export const WhatsAppItemSchema = z.object({
  id: z.string(),
  headline: z.string(),
  priceUsd: z.number().nullish(),
  bedrooms: z.number().nullish(),
  bathrooms: z.number().nullish(),
  shortLink: z.string(),
  previewImage: z.string().nullish(),
});

export const WhatsAppResponseSchema = z.object({
  reply: z.string(),
  items: z.array(WhatsAppItemSchema),
});

export const FacebookDestinationSchema = z.object({
  endpoint: z.string(),
  status: z.string(),
  id: z.string().optional(),
});

export const FacebookPublishResponseSchema = z.object({
  posted: z.boolean(),
  message: z.string(),
  shortLink: z.string(),
  destinations: z.array(FacebookDestinationSchema),
});

export const PendingGeoSchema = z.object({
  id: z.string(),
  level: z.string(),
  parentId: z.string().nullish(),
  proposedName: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  proposedBy: z
    .object({
      id: z.string(),
      name: z.string().nullish(),
      email: z.string().nullish(),
    })
    .nullish(),
  properties: z.array(z.object({ id: z.string() })),
});

export const InvoiceLineSchema = z
  .object({
    id: z.string(),
    sku: z.string(),
    description: z.string(),
    qty: z.number(),
    unitPriceCents: z.number(),
    totalCents: z.number(),
    metaJson: z.unknown().nullable(),
  })
  .passthrough();

export const FxRateSchema = z
  .object({
    id: z.string(),
    base: z.string(),
    quote: z.string(),
    rateMicros: z.number(),
    date: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const InvoiceSchema = z
  .object({
    id: z.string(),
    invoiceNo: z.string().nullish(),
    status: z.string(),
    amountCents: z.number(),
    taxCents: z.number(),
    amountUsdCents: z.number().nullish(),
    taxUsdCents: z.number().nullish(),
    currency: z.string(),
    dueAt: z.string().nullish(),
    issuedAt: z.string().nullish(),
    createdAt: z.string(),
    lines: z.array(InvoiceLineSchema).default([]),
    promoBoost: z.object({ id: z.string() }).nullish(),
    campaign: z.object({ id: z.string() }).nullish(),
    fxRate: FxRateSchema.nullish(),
  })
  .passthrough();

export const PaymentIntentSchema = z
  .object({
    id: z.string(),
    invoiceId: z.string(),
    gateway: z.string(),
    reference: z.string(),
    amountCents: z.number(),
    currency: z.string(),
    status: z.string(),
    redirectUrl: z.string().nullish(),
    gatewayRef: z.string().nullish(),
    createdAt: z.string(),
    invoice: InvoiceSchema.pick({
      id: true,
      invoiceNo: true,
      status: true,
      currency: true,
    }).nullish(),
  })
  .passthrough();

export const TransactionSchema = z
  .object({
    id: z.string(),
    invoiceId: z.string(),
    gateway: z.string(),
    externalRef: z.string(),
    amountCents: z.number(),
    currency: z.string(),
    feeCents: z.number(),
    netCents: z.number(),
    result: z.string(),
    createdAt: z.string(),
    receiptPdfUrl: z.string().nullish(),
    invoice: InvoiceSchema.pick({
      id: true,
      invoiceNo: true,
      status: true,
      currency: true,
    }).nullish(),
  })
  .passthrough();

export const KycRecordSchema = z
  .object({
    id: z.string(),
    ownerType: z.string(),
    ownerId: z.string(),
    idType: z.string(),
    idNumber: z.string(),
    docUrls: z.array(z.string()),
    docTypes: z.array(z.string()).nullish(),
    idExpiryDate: z.string().nullish(),
    status: z.string(),
    notes: z.string().nullish(),
    ownerDetails: z.unknown().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const PayoutAccountSchema = z
  .object({
    id: z.string(),
    ownerType: z.string(),
    ownerId: z.string(),
    type: z.string(),
    displayName: z.string(),
    detailsJson: z.unknown(),
    verifiedAt: z.string().nullish(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const PayoutRequestSchema = z
  .object({
    id: z.string(),
    walletId: z.string(),
    amountCents: z.number(),
    method: z.string(),
    payoutAccountId: z.string(),
    status: z.string(),
    scheduledFor: z.string().nullish(),
    txRef: z.string().nullish(),
    createdAt: z.string(),
    updatedAt: z.string(),
    wallet: z
      .object({
        id: z.string(),
        ownerType: z.string(),
        ownerId: z.string(),
        balanceCents: z.number(),
      })
      .passthrough()
      .nullish(),
    payoutAccount: PayoutAccountSchema.nullish(),
  })
  .passthrough();

export const AmlBlocklistEntrySchema = z.object({
  id: z.string(),
  value: z.string(),
  normalized: z.string(),
  reason: z.string().nullish(),
  addedBy: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  enabled: z.boolean(),
});

export const WalletThresholdSchema = z.object({
  id: z.string().nullish(),
  type: z.string(),
  currency: z.string(),
  amountCents: z.number(),
  note: z.string().nullish(),
  source: z.enum(["custom", "env"]),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const GeoSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  parentId: z.string().nullish(),
  provinceId: z.string().nullish(),
  countryId: z.string().nullish(),
  cityName: z.string().nullish(),
  provinceName: z.string().nullish(),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;
export type AdminOverviewMetrics = z.infer<typeof AdminOverviewMetricsSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type AdImpression = z.infer<typeof AdImpressionSchema>;
export type ShortLink = z.infer<typeof ShortLinkSchema>;
export type WhatsAppItem = z.infer<typeof WhatsAppItemSchema>;
export type WhatsAppResponse = z.infer<typeof WhatsAppResponseSchema>;
export type FacebookPublishResponse = z.infer<
  typeof FacebookPublishResponseSchema
>;
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
export type PendingGeo = z.infer<typeof PendingGeoSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type KycRecord = z.infer<typeof KycRecordSchema>;
export type PayoutAccount = z.infer<typeof PayoutAccountSchema>;
export type PayoutRequest = z.infer<typeof PayoutRequestSchema>;
export type AmlBlocklistEntry = z.infer<typeof AmlBlocklistEntrySchema>;
export type WalletThreshold = z.infer<typeof WalletThresholdSchema>;
export type GeoSearchResult = z.infer<typeof GeoSearchResultSchema>;
export type DailyAdsPoint = z.infer<typeof DailyAdsPointSchema>;
export type TopAgentPerformance = z.infer<typeof TopAgentPerformanceSchema>;
export type TopAgentsResponse = z.infer<typeof TopAgentsResponseSchema>;
export type GeoListingsResponse = z.infer<typeof GeoListingsResponseSchema>;
export type RewardsEstimate = z.infer<typeof RewardsEstimateSchema>;

export const SiteVisitSchema = z
  .object({
    id: z.string(),
    propertyId: z.string(),
    requestedByUserId: z.string(),
    status: z.string(),
    assignedModeratorId: z.string().nullish(),
    visitGpsLat: z.number().nullish(),
    visitGpsLng: z.number().nullish(),
    distanceFromSubmittedGps: z.number().nullish(),
    notes: z.string().nullish(),
    completedAt: z.string().nullish(),
    createdAt: z.string(),
    updatedAt: z.string(),
    property: PropertySchema.nullish(),
    requestedBy: UserSummarySchema.nullish(),
    assignedModerator: UserSummarySchema.nullish(),
  })
  .passthrough();

export const RiskEventSchema = z
  .object({
    id: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    signalType: z.string(),
    scoreDelta: z.number(),
    notes: z.string().nullish(),
    resolvedBy: z.string().nullish(),
    timestamp: z.string(),
  })
  .passthrough();

export const RiskEntitySummarySchema = z.object({
  riskScore: z.number(),
  penaltyMultiplier: z.number(),
  events: z.array(RiskEventSchema),
});

export type SiteVisit = z.infer<typeof SiteVisitSchema>;
export type RiskEvent = z.infer<typeof RiskEventSchema>;
export type RiskEntitySummary = z.infer<typeof RiskEntitySummarySchema>;
export const AdminUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string(), // Keeping as string to avoid zod enum issues, frontend can cast if needed
  status: z.string().nullable(),
  isVerified: z.boolean(),
  verificationScore: z.number(),
  trustScore: z.number(),
  kycStatus: z.string().nullable(),
  createdAt: z.string(),
});

export const AdminAgencySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  trustScore: z.number(),
  verificationScore: z.number(),
  createdAt: z.string(),
  _count: z.object({
    members: z.number(),
  }),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  actorId: z.string().nullable(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string(),
  actor: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;
export type AdminAgency = z.infer<typeof AdminAgencySchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

export const ApplicationStatusSchema = z.enum([
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const ApplicationSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  userId: z.string(),
  status: ApplicationStatusSchema,
  notes: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  property: PropertySchema.optional(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      profilePhoto: z.string().nullable(),
    })
    .optional(),
});

export type ApplicationStatus = z.infer<typeof ApplicationStatusSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export const DealSchema = z
  .object({
    id: z.string(),
    propertyId: z.string(),
    tenantId: z.string(),
    landlordId: z.string(),
    agentId: z.string().nullish(),
    applicationId: z.string(),
    status: z.string(),
    startDate: z.string(),
    endDate: z.string().nullish(),
    rentAmount: z.number(),
    depositAmount: z.number().nullish(),
    currency: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    property: PropertySchema.nullish(),
    tenant: UserSummarySchema.nullish(),
    landlord: UserSummarySchema.nullish(),
    agent: UserSummarySchema.nullish(),
    application: ApplicationSchema.nullish(),
  })
  .passthrough();

export type Deal = z.infer<typeof DealSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sender: UserSummarySchema.optional(),
});

export const ConversationParticipantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  conversationId: z.string(),
  lastReadAt: z.string().nullable(),
  joinedAt: z.string(),
  user: UserSummarySchema.optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  dealId: z.string().nullable(),
  applicationId: z.string().nullable(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  property: PropertySchema.optional(),
  participants: z.array(ConversationParticipantSchema).optional(),
  messages: z.array(MessageSchema).optional(),
});

export type Message = z.infer<typeof MessageSchema>;
export type ConversationParticipant = z.infer<
  typeof ConversationParticipantSchema
>;
export type Conversation = z.infer<typeof ConversationSchema>;

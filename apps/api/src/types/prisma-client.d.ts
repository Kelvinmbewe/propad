import type { Decimal as RuntimeDecimal } from '@prisma/client/runtime/library';

declare module '@prisma/client' {
  type LiteralEnum<T extends string> = { readonly [K in T]: K };
  type EnumValues<T extends LiteralEnum<string>> = T[keyof T];

  export const Role: LiteralEnum<'ADMIN' | 'VERIFIER' | 'AGENT' | 'LANDLORD' | 'USER'>;
  export type Role = EnumValues<typeof Role>;

  export const PropertyType: LiteralEnum<
    | 'ROOM'
    | 'COTTAGE'
    | 'HOUSE'
    | 'APARTMENT'
    | 'TOWNHOUSE'
    | 'PLOT'
    | 'LAND'
    | 'COMMERCIAL_OFFICE'
    | 'COMMERCIAL_RETAIL'
    | 'COMMERCIAL_INDUSTRIAL'
    | 'WAREHOUSE'
    | 'FARM'
    | 'MIXED_USE'
    | 'OTHER'
  >;
  export type PropertyType = EnumValues<typeof PropertyType>;

  export const PowerPhase: LiteralEnum<'SINGLE' | 'THREE'>;
  export type PowerPhase = EnumValues<typeof PowerPhase>;

  export const PropertyAvailability: LiteralEnum<'IMMEDIATE' | 'DATE'>;
  export type PropertyAvailability = EnumValues<typeof PropertyAvailability>;

  export const PropertyFurnishing: LiteralEnum<'NONE' | 'PARTLY' | 'FULLY'>;
  export type PropertyFurnishing = EnumValues<typeof PropertyFurnishing>;

  export const Currency: LiteralEnum<'USD' | 'ZWG'>;
  export type Currency = EnumValues<typeof Currency>;

  export const InvoicePurpose: LiteralEnum<'DIRECT_AD' | 'PROMO_BOOST' | 'OTHER'>;
  export type InvoicePurpose = EnumValues<typeof InvoicePurpose>;

  export const InvoiceStatus: LiteralEnum<'DRAFT' | 'OPEN' | 'PAID' | 'VOID'>;
  export type InvoiceStatus = EnumValues<typeof InvoiceStatus>;

  export const PaymentGateway: LiteralEnum<'PAYNOW' | 'STRIPE' | 'PAYPAL' | 'OFFLINE'>;
  export type PaymentGateway = EnumValues<typeof PaymentGateway>;

  export const PaymentMethodType: LiteralEnum<'CARD' | 'ECOCASH' | 'BANK'>;
  export type PaymentMethodType = EnumValues<typeof PaymentMethodType>;

  export const PaymentMethodStatus: LiteralEnum<'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'REVOKED'>;
  export type PaymentMethodStatus = EnumValues<typeof PaymentMethodStatus>;

  export const PaymentIntentStatus: LiteralEnum<
    'REQUIRES_ACTION' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
  >;
  export type PaymentIntentStatus = EnumValues<typeof PaymentIntentStatus>;

  export const TransactionResult: LiteralEnum<'SUCCESS' | 'FAILED'>;
  export type TransactionResult = EnumValues<typeof TransactionResult>;

  export const PropertyStatus: LiteralEnum<
    | 'DRAFT'
    | 'PENDING_VERIFY'
    | 'VERIFIED'
    | 'UNDER_OFFER'
    | 'RENTED'
    | 'SOLD'
    | 'ARCHIVED'
  >;
  export type PropertyStatus = EnumValues<typeof PropertyStatus>;

  export const MediaKind: LiteralEnum<'IMAGE' | 'VIDEO'>;
  export type MediaKind = EnumValues<typeof MediaKind>;

  export const VerificationMethod: LiteralEnum<'AUTO' | 'CALL' | 'SITE' | 'DOCS'>;
  export type VerificationMethod = EnumValues<typeof VerificationMethod>;

  export const VerificationResult: LiteralEnum<'PASS' | 'FAIL'>;
  export type VerificationResult = EnumValues<typeof VerificationResult>;

  export const LeadSource: LiteralEnum<'WEB' | 'WHATSAPP' | 'FACEBOOK' | 'SHORTLINK'>;
  export type LeadSource = EnumValues<typeof LeadSource>;

  export const LeadStatus: LiteralEnum<'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED'>;
  export type LeadStatus = EnumValues<typeof LeadStatus>;

  export const AgencyMemberRole: LiteralEnum<'OWNER' | 'MANAGER' | 'AGENT'>;
  export type AgencyMemberRole = EnumValues<typeof AgencyMemberRole>;

  export const AgencyStatus: LiteralEnum<'PENDING' | 'ACTIVE' | 'SUSPENDED'>;
  export type AgencyStatus = EnumValues<typeof AgencyStatus>;

  export const ManagementContractScope: LiteralEnum<'LETTING_ONLY' | 'FULL_MANAGEMENT'>;
  export type ManagementContractScope = EnumValues<typeof ManagementContractScope>;

  export const ManagementFeeType: LiteralEnum<'FLAT' | 'PERCENT'>;
  export type ManagementFeeType = EnumValues<typeof ManagementFeeType>;

  export const ManagementContractStatus: LiteralEnum<'DRAFT' | 'ACTIVE' | 'ENDED' | 'TERMINATED'>;
  export type ManagementContractStatus = EnumValues<typeof ManagementContractStatus>;

  export const GeoLevel: LiteralEnum<'COUNTRY' | 'PROVINCE' | 'CITY' | 'SUBURB'>;
  export type GeoLevel = EnumValues<typeof GeoLevel>;

  export const PendingGeoStatus: LiteralEnum<'PENDING' | 'APPROVED' | 'REJECTED'>;
  export type PendingGeoStatus = EnumValues<typeof PendingGeoStatus>;

  export const RewardEventType: LiteralEnum<
    'LISTING_VERIFIED' | 'LEAD_VALID' | 'SALE_CONFIRMED' | 'BONUS_TIER' | 'PROMO_REBATE'
  >;
  export type RewardEventType = EnumValues<typeof RewardEventType>;

  export const ListingEventType: LiteralEnum<'RENTED' | 'SOLD' | 'REOPENED' | 'DISCOUNT' | 'UNDER_OFFER'>;
  export type ListingEventType = EnumValues<typeof ListingEventType>;

  export const NotificationType: LiteralEnum<'RENTED' | 'SOLD' | 'DISCOUNT' | 'REOPENED' | 'REWARD' | 'CHAT' | 'SYSTEM'>;
  export type NotificationType = EnumValues<typeof NotificationType>;

  export const NotificationStatus: LiteralEnum<'SENT' | 'READ' | 'FAILED'>;
  export type NotificationStatus = EnumValues<typeof NotificationStatus>;

  export const NotificationChannel: LiteralEnum<'EMAIL' | 'PUSH' | 'WHATSAPP' | 'INAPP'>;
  export type NotificationChannel = EnumValues<typeof NotificationChannel>;

  export const NotificationLogStatus: LiteralEnum<'OK' | 'FAIL'>;
  export type NotificationLogStatus = EnumValues<typeof NotificationLogStatus>;

  export const OwnerType: LiteralEnum<'USER' | 'AGENCY'>;
  export type OwnerType = EnumValues<typeof OwnerType>;

  export const PayoutMethod: LiteralEnum<'ECOCASH' | 'BANK' | 'WALLET'>;
  export type PayoutMethod = EnumValues<typeof PayoutMethod>;

  export const PayoutStatus: LiteralEnum<'REQUESTED' | 'REVIEW' | 'APPROVED' | 'SENT' | 'PAID' | 'FAILED' | 'CANCELLED'>;
  export type PayoutStatus = EnumValues<typeof PayoutStatus>;

  export const KycStatus: LiteralEnum<'PENDING' | 'VERIFIED' | 'REJECTED'>;
  export type KycStatus = EnumValues<typeof KycStatus>;

  export const KycIdType: LiteralEnum<'NATIONAL_ID' | 'PASSPORT' | 'CERT_OF_INC'>;
  export type KycIdType = EnumValues<typeof KycIdType>;

  export const WalletTransactionType: LiteralEnum<'CREDIT' | 'DEBIT'>;
  export type WalletTransactionType = EnumValues<typeof WalletTransactionType>;

  export const WalletTransactionSource: LiteralEnum<'REWARD_EVENT' | 'PROMO_SHARE' | 'BONUS' | 'PAYOUT' | 'ADJUSTMENT'>;
  export type WalletTransactionSource = EnumValues<typeof WalletTransactionSource>;

  export const PromoTier: LiteralEnum<'LITE' | 'PLUS' | 'TOP'>;
  export type PromoTier = EnumValues<typeof PromoTier>;

  export const PolicyStrikeReason: LiteralEnum<'VIEWING_FEE' | 'SCAM' | 'MISREPRESENTATION'>;
  export type PolicyStrikeReason = EnumValues<typeof PolicyStrikeReason>;

  export const AdvertiserStatus: LiteralEnum<'ACTIVE' | 'PAUSED' | 'SUSPENDED'>;
  export type AdvertiserStatus = EnumValues<typeof AdvertiserStatus>;

  export const AdCreativeType: LiteralEnum<'IMAGE' | 'HTML' | 'SCRIPT'>;
  export type AdCreativeType = EnumValues<typeof AdCreativeType>;

  export const AdPlacementPage: LiteralEnum<'HOME' | 'SEARCH' | 'DETAIL' | 'ARTICLE' | 'GLOBAL'>;
  export type AdPlacementPage = EnumValues<typeof AdPlacementPage>;

  export const AdPlacementPosition: LiteralEnum<'HEADER' | 'SIDEBAR' | 'INLINE' | 'FOOTER' | 'INTERSTITIAL'>;
  export type AdPlacementPosition = EnumValues<typeof AdPlacementPosition>;

  export const AdCampaignStatus: LiteralEnum<'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED'>;
  export type AdCampaignStatus = EnumValues<typeof AdCampaignStatus>;

  export type PrismaPromise<T = any> = Promise<T>;

  export interface PrismaClientEventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export class PrismaClient implements PrismaClientEventEmitter {
    constructor(options?: Prisma.PrismaClientOptions);
    $use(middleware: Prisma.Middleware): void;
    $transaction<T = any>(fn: (client: PrismaClient) => Promise<T>, options?: Record<string, any>): Promise<T>;
    $transaction<T = any>(operations: PrismaPromise<T>[], options?: Record<string, any>): Promise<T[]>;
    $on(event: string, handler: (...args: any[]) => void): void;
    $disconnect(): Promise<void>;
    [key: string]: any;
  }

  export namespace Prisma {
    export type PrismaAction = string;
    export type MiddlewareParams = {
      model?: string;
      action: PrismaAction;
      args: Record<string, any>;
      dataPath: string[];
      runInTransaction: boolean;
    };
    export type Middleware<T = any> = (params: MiddlewareParams, next: (params: MiddlewareParams) => Promise<T>) => Promise<T>;
    export type PrismaClientOptions = Record<string, any>;
    export const JsonNull: null;
    export type Decimal = RuntimeDecimal;
    export const Decimal: { new (value: number | string | bigint): Decimal };
    export type JsonObject = Record<string, any>;
    export type PropertyInclude = Record<string, any>;
    export type PropertyWhereInput = Record<string, any>;
    export type WalletUpdateInput = Record<string, any>;
    export type TransactionClient = PrismaClient;
  }

  export type Country = Record<string, any>;
  export type Province = Record<string, any>;
  export type City = Record<string, any>;
  export type Suburb = Record<string, any>;
  export type PendingGeo = Record<string, any>;
  export type FxRate = Record<string, any>;
  export type Invoice = Record<string, any>;
  export type InvoiceLine = Record<string, any>;
  export type PaymentIntent = Record<string, any>;
  export type PaymentMethod = Record<string, any>;
  export type Wallet = Record<string, any>;
  export type WalletThreshold = Record<string, any>;
  export type WalletTransaction = Record<string, any>;
  export type FeatureFlag = Record<string, any>;
  export type Promo = Record<string, any>;
  export type Property = Record<string, any>;
  export type RewardEvent = Record<string, any>;
  export type Verification = Record<string, any>;
  export type Transaction = Record<string, any>;
}

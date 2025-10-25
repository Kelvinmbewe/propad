import * as PrismaClientModule from '@prisma/client';

const enumMap = {
  Role: ['ADMIN', 'VERIFIER', 'AGENT', 'LANDLORD', 'USER'],
  PropertyType: [
    'ROOM',
    'COTTAGE',
    'HOUSE',
    'APARTMENT',
    'TOWNHOUSE',
    'PLOT',
    'LAND',
    'COMMERCIAL_OFFICE',
    'COMMERCIAL_RETAIL',
    'COMMERCIAL_INDUSTRIAL',
    'WAREHOUSE',
    'FARM',
    'MIXED_USE',
    'OTHER'
  ],
  PowerPhase: ['SINGLE', 'THREE'],
  PropertyAvailability: ['IMMEDIATE', 'DATE'],
  PropertyFurnishing: ['NONE', 'PARTLY', 'FULLY'],
  Currency: ['USD', 'ZWG'],
  InvoicePurpose: ['DIRECT_AD', 'PROMO_BOOST', 'OTHER'],
  InvoiceStatus: ['DRAFT', 'OPEN', 'PAID', 'VOID'],
  PaymentGateway: ['PAYNOW', 'STRIPE', 'PAYPAL', 'OFFLINE'],
  PaymentMethodType: ['CARD', 'ECOCASH', 'BANK'],
  PaymentMethodStatus: ['ACTIVE', 'INACTIVE', 'BLOCKED', 'REVOKED'],
  PaymentIntentStatus: ['REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED'],
  TransactionResult: ['SUCCESS', 'FAILED'],
  PropertyStatus: ['DRAFT', 'PENDING_VERIFY', 'VERIFIED', 'UNDER_OFFER', 'RENTED', 'SOLD', 'ARCHIVED'],
  MediaKind: ['IMAGE', 'VIDEO'],
  VerificationMethod: ['AUTO', 'CALL', 'SITE'],
  VerificationResult: ['APPROVED', 'REJECTED', 'REVISION_REQUIRED'],
  LeadSource: ['PORTAL', 'LANDLORD_PORTAL', 'SHORTLINK', 'UNKNOWN'],
  LeadStatus: ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'],
  AgencyMemberRole: ['ADMIN', 'AGENT', 'VIEWER'],
  AgencyStatus: ['ACTIVE', 'INACTIVE'],
  ManagementContractScope: ['LET_ONLY', 'FULL_MANAGEMENT'],
  ManagementFeeType: ['PERCENTAGE', 'FIXED'],
  ManagementContractStatus: ['ACTIVE', 'ENDED', 'PENDING'],
  GeoLevel: ['COUNTRY', 'PROVINCE', 'CITY', 'SUBURB', 'PENDING'],
  PendingGeoStatus: ['PENDING', 'APPROVED', 'REJECTED'],
  RewardEventType: ['LISTING_VERIFIED', 'REFERRAL', 'BONUS'],
  ListingEventType: ['CREATED', 'UPDATED', 'ARCHIVED'],
  NotificationType: ['EMAIL', 'SMS', 'PUSH'],
  NotificationStatus: ['PENDING', 'SENT', 'FAILED'],
  NotificationChannel: ['EMAIL', 'SMS', 'WHATSAPP'],
  NotificationLogStatus: ['PENDING', 'SENT', 'FAILED'],
  OwnerType: ['USER', 'AGENCY'],
  PayoutMethod: ['BANK', 'ECOCASH'],
  PayoutStatus: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED'],
  KycStatus: ['PENDING', 'VERIFIED', 'REJECTED'],
  KycIdType: ['NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE'],
  WalletTransactionType: ['CREDIT', 'DEBIT'],
  WalletTransactionSource: ['PAYMENT', 'PAYOUT', 'ADJUSTMENT'],
  PromoTier: ['BRONZE', 'SILVER', 'GOLD'],
  PolicyStrikeReason: ['FRAUD', 'SCAM', 'OTHER'],
  AdvertiserStatus: ['ACTIVE', 'SUSPENDED'],
  AdCreativeType: ['IMAGE', 'VIDEO', 'TEXT'],
  AdPlacementPage: ['HOME', 'SEARCH', 'LISTING'],
  AdPlacementPosition: ['TOP', 'MIDDLE', 'BOTTOM'],
  AdCampaignStatus: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']
} as const;

type EnumKey = keyof typeof enumMap;

type PrismaModule = typeof PrismaClientModule & Record<EnumKey, Record<string, string>> & {
  Decimal?: typeof DecimalPolyfill;
};

const target = PrismaClientModule as PrismaModule;

const defineEnum = (values: readonly string[]) =>
  Object.freeze(
    values.reduce<Record<string, string>>((acc, value) => {
      acc[value] = value;
      return acc;
    }, {})
  );

const ensureEnum = (key: EnumKey) => {
  if (!(key in target)) {
    Object.defineProperty(target, key, {
      value: defineEnum(enumMap[key]),
      enumerable: true,
      configurable: false
    });
  }
};

class DecimalPolyfill {
  private readonly value: bigint;

  constructor(input: number | string | bigint) {
    if (typeof input === 'bigint') {
      this.value = input;
      return;
    }

    const normalized = typeof input === 'number' ? input : Number.parseFloat(String(input));
    if (!Number.isFinite(normalized)) {
      throw new TypeError('Invalid decimal value');
    }

    this.value = BigInt(Math.round(normalized * 1_000_000));
  }

  toNumber() {
    return Number(this.value) / 1_000_000;
  }

  toString() {
    return this.toNumber().toString();
  }

  valueOf() {
    return this.toNumber();
  }
}

Object.keys(enumMap).forEach((key) => ensureEnum(key as EnumKey));

if (!('Decimal' in target)) {
  Object.defineProperty(target, 'Decimal', {
    value: DecimalPolyfill,
    enumerable: true
  });
}

if ('Prisma' in target) {
  const prisma = (target as any).Prisma;
  if (prisma && !('JsonNull' in prisma)) {
    Object.defineProperty(prisma, 'JsonNull', {
      value: null,
      enumerable: true
    });
  }
  if (prisma && !('Decimal' in prisma)) {
    Object.defineProperty(prisma, 'Decimal', {
      value: DecimalPolyfill,
      enumerable: true
    });
  }
}

export {};

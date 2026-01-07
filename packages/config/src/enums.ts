export enum Role {
    ADMIN = 'ADMIN',
    VERIFIER = 'VERIFIER',
    AGENT = 'AGENT',
    LANDLORD = 'LANDLORD',
    USER = 'USER',
    MODERATOR = 'MODERATOR',
    COMPANY_ADMIN = 'COMPANY_ADMIN',
    COMPANY_AGENT = 'COMPANY_AGENT',
    INDEPENDENT_AGENT = 'INDEPENDENT_AGENT',
    SELLER = 'SELLER',
    TENANT = 'TENANT',
    BUYER = 'BUYER',
    ADVERTISER = 'ADVERTISER',
}

export enum PayoutMethod {
    ECOCASH = 'ECOCASH',
    ONEMONEY = 'ONEMONEY',
    BANK = 'BANK',
    BANK_TRANSFER = 'BANK_TRANSFER',
    ZIPIT = 'ZIPIT',
    WALLET = 'WALLET',
    CASH = 'CASH',
    OTHER = 'OTHER',
}

export enum PowerPhase {
    SINGLE = 'SINGLE',
    THREE = 'THREE',
}

export const PropertyTypeEnum = {
    ROOM: 'ROOM',
    COTTAGE: 'COTTAGE',
    HOUSE: 'HOUSE',
    APARTMENT: 'APARTMENT',
    TOWNHOUSE: 'TOWNHOUSE',
    PLOT: 'PLOT',
    LAND: 'LAND',
    COMMERCIAL_OFFICE: 'COMMERCIAL_OFFICE',
    COMMERCIAL_RETAIL: 'COMMERCIAL_RETAIL',
    COMMERCIAL_INDUSTRIAL: 'COMMERCIAL_INDUSTRIAL',
    WAREHOUSE: 'WAREHOUSE',
    FARM: 'FARM',
    MIXED_USE: 'MIXED_USE',
    OTHER: 'OTHER'
} as const;

export const PropertyFurnishingEnum = {
    NONE: 'NONE',
    PARTLY: 'PARTLY',
    FULLY: 'FULLY'
} as const;

export const PowerPhaseEnum = {
    SINGLE: 'SINGLE',
    THREE: 'THREE'
} as const;

export const GeoLevelEnum = {
    COUNTRY: 'COUNTRY',
    PROVINCE: 'PROVINCE',
    CITY: 'CITY',
    SUBURB: 'SUBURB'
} as const;

export const PropertyAvailabilityEnum = {
    IMMEDIATE: 'IMMEDIATE',
    DATE: 'DATE'
} as const;

export const CurrencyEnum = {
    USD: 'USD',
    ZWG: 'ZWG'
} as const;

export enum PaymentProvider {
    PAYNOW = 'PAYNOW',
    STRIPE = 'STRIPE',
    PAYPAL = 'PAYPAL',
    MANUAL = 'MANUAL'
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
    CANCELLED = 'CANCELLED',
    PAID = 'PAID'
}

export enum ChargeableItemType {
    FEATURE = 'FEATURE',
    BOOST = 'BOOST',
    SUBSCRIPTION = 'SUBSCRIPTION',
    OTHER = 'OTHER',
}

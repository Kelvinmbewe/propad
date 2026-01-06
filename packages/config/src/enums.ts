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

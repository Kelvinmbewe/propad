// Runtime enum objects for class-validator that work even when Prisma enums are undefined
// These are plain objects (NO as const, NO enum types) that class-validator can use

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
};

export const PropertyFurnishingEnum = {
  NONE: 'NONE',
  PARTLY: 'PARTLY',
  FULLY: 'FULLY'
};

export const PowerPhaseEnum = {
  SINGLE: 'SINGLE',
  THREE: 'THREE'
};

export const GeoLevelEnum = {
  COUNTRY: 'COUNTRY',
  PROVINCE: 'PROVINCE',
  CITY: 'CITY',
  SUBURB: 'SUBURB'
};

export const PropertyAvailabilityEnum = {
  IMMEDIATE: 'IMMEDIATE',
  DATE: 'DATE'
};

export const CurrencyEnum = {
  USD: 'USD',
  ZWG: 'ZWG'
};


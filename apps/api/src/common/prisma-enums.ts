// Safe enum objects for class-validator that work even when Prisma enums are undefined at runtime
// These match the Prisma schema enums exactly

export const PropertyTypeEnum: Record<string, string> = {
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

export const PropertyFurnishingEnum: Record<string, string> = {
  NONE: 'NONE',
  PARTLY: 'PARTLY',
  FULLY: 'FULLY'
};

export const PowerPhaseEnum: Record<string, string> = {
  SINGLE: 'SINGLE',
  THREE: 'THREE'
};


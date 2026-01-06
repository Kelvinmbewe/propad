import { PropertyFurnishing, PropertyType } from '@prisma/client';
import { PropertyFurnishingEnum, PropertyTypeEnum, PowerPhaseEnum } from '@propad/sdk';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchPropertiesDto {
  @IsOptional()
  @IsEnum(PropertyTypeEnum)
  type?: PropertyType;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsString()
  provinceId?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  suburbId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(1000000)
  priceMax?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsString()
  filters?: string;

  @IsOptional()
  @IsString()
  bounds?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @IsEnum(PropertyFurnishingEnum)
  furnished?: PropertyFurnishing;

  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  minFloorArea?: number;

  @IsOptional()
  @IsString()
  zoning?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = String(value).toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  parking?: boolean;

  @IsOptional()
  @IsEnum(PowerPhaseEnum)
  powerPhase?: PowerPhase;

  // --- Smart Ranking Fields ---
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === '1' || value === true) return true;
    return false;
  })
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @IsString()
  sort?: string; // RELEVANCE, NEWEST, PRICE_ASC, PRICE_DESC, TRUST_DESC
}

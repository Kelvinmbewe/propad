import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import {
  Currency,
  InterestStatus,
  ListingActivityType,
  ListingCreatorRole,
  ListingPaymentStatus,
  ListingPaymentType,
  Prisma,
  PropertyAvailability,
  PropertyFurnishing,
  PropertyRatingType,
  PropertyStatus,
  PropertyType,
  Role,
  RewardEventType,
  VerificationItemStatus,
  VerificationStatus,
  ViewingStatus
} from '@prisma/client';
import { PowerPhase } from '../common/enums';
import { createHmac, randomUUID } from 'crypto';
import { extname, join, resolve } from 'path';
import { mkdir, writeFile, unlink, appendFile } from 'fs/promises';
import { env } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GeoService } from '../geo/geo.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SubmitForVerificationDto } from './dto/submit-verification.dto';
import { MapBoundsDto } from './dto/map-bounds.dto';
import { CreateSignedUploadDto } from './dto/signed-upload.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';
import { AssignAgentDto } from './dto/assign-agent.dto';
import { UpdateDealConfirmationDto } from './dto/update-deal-confirmation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateServiceFeeDto } from './dto/update-service-fee.dto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'video/mp4',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.pdf', '.doc', '.docx']);

type AuthContext = {
  userId: string;
  role: Role;
};

const SALE_CONFIRMED_POINTS = 150;
const SALE_CONFIRMED_USD_CENTS = 0;

const COMMERCIAL_TYPES: ReadonlySet<PropertyType> = new Set([
  PropertyType.COMMERCIAL_OFFICE,
  PropertyType.COMMERCIAL_RETAIL,
  PropertyType.COMMERCIAL_INDUSTRIAL,
  PropertyType.WAREHOUSE,
  PropertyType.FARM,
  PropertyType.MIXED_USE,
  PropertyType.OTHER
]);

const RESIDENTIAL_TYPES: ReadonlySet<PropertyType> = new Set([
  PropertyType.ROOM,
  PropertyType.COTTAGE,
  PropertyType.HOUSE,
  PropertyType.APARTMENT,
  PropertyType.TOWNHOUSE
]);

type NormalizedBounds = {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
};

type NormalizedFilters = {
  type?: PropertyType;
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  suburbId?: string;
  priceMin?: number;
  priceMax?: number;
  bounds?: NormalizedBounds;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: PropertyFurnishing;
  amenities?: string[];
  minFloorArea?: number;
  zoning?: string;
  parking?: boolean;
  powerPhase?: PowerPhase;
};

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly geo: GeoService
  ) { }

  /**
   * Recursively convert Prisma Decimal types and Date objects for JSON serialization
   * Uses a Set to track visited objects and prevent circular reference issues
   */
  private convertDecimalsToNumbers(obj: any, visited: Set<any> = new Set()): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Prevent circular references
    if (typeof obj === 'object') {
      if (visited.has(obj)) {
        return '[Circular]';
      }
      visited.add(obj);
    }

    try {
      // Check if it's a Prisma Decimal
      if (obj && typeof obj === 'object' && 'toNumber' in obj && typeof obj.toNumber === 'function') {
        return obj.toNumber();
      }

      // Check if it's a Date object - convert to ISO string
      if (obj instanceof Date) {
        return obj.toISOString();
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => this.convertDecimalsToNumbers(item, visited));
      }

      // Handle objects (but skip functions and special objects)
      if (typeof obj === 'object') {
        // Skip Buffer and other special objects
        if (obj instanceof Buffer || obj.constructor?.name === 'Buffer') {
          return obj;
        }

        const converted: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            try {
              converted[key] = this.convertDecimalsToNumbers(obj[key], visited);
            } catch (error) {
              // Skip properties that can't be converted
              this.logger.warn(`Failed to convert property ${key}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
        return converted;
      }

      return obj;
    } finally {
      // Clean up visited set for this branch
      if (typeof obj === 'object') {
        visited.delete(obj);
      }
    }
  }

  /**
   * Log debug information to file
   */
  private async logDebug(location: string, message: string, data: any, hypothesisId?: string): Promise<void> {
    try {
      const logEntry = JSON.stringify({
        location,
        message,
        data,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId
      }) + '\n';
      await mkdir('.cursor', { recursive: true }).catch(() => { });
      await appendFile('.cursor/debug.log', logEntry).catch(() => { });
    } catch {
      // Ignore logging errors
    }
  }

  private pickString(...values: Array<string | null | undefined>): string | undefined {
    for (const value of values) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return undefined;
  }

  private removeUndefined<T extends Record<string, any>>(input: T): T {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result as T;
  }

  private attachLocation<T extends Record<string, any>>(property: T) {
    // #region agent log
    this.logDebug('properties.service.ts:207', 'attachLocation entry', { propertyId: property?.id, hasCountry: !!property?.country, hasProvince: !!property?.province, hasPrice: !!property?.price, priceType: typeof property?.price }, 'A').catch(() => { });
    // #endregion
    try {
      // Safely extract location data with proper null checks
      const country = property.country && typeof property.country === 'object' ? property.country : null;
      const province = property.province && typeof property.province === 'object' ? property.province : null;
      const city = property.city && typeof property.city === 'object' ? property.city : null;
      const suburb = property.suburb && typeof property.suburb === 'object' ? property.suburb : null;
      const pendingGeo = property.pendingGeo && typeof property.pendingGeo === 'object' ? property.pendingGeo : null;

      // #region agent log
      this.logDebug('properties.service.ts:219', 'attachLocation before spread', { propertyId: property?.id, countryType: typeof country, provinceType: typeof province }, 'A').catch(() => { });
      // #endregion

      // Exclude Prisma relation objects from the spread to avoid serialization issues
      const { country: _country, province: _province, city: _city, suburb: _suburb, pendingGeo: _pendingGeo, ...cleanProperty } = property as any;

      // #region agent log
      this.logDebug('properties.service.ts:226', 'attachLocation after spread', { propertyId: property?.id, cleanPropertyKeys: Object.keys(cleanProperty).slice(0, 10), hasPrice: !!cleanProperty?.price, priceType: typeof cleanProperty?.price, priceValue: cleanProperty?.price?.toString?.()?.substring(0, 20) }, 'B').catch(() => { });
      // #endregion

      // Use pending geo's proposed name as suburb name if no regular suburb exists
      const suburbName = suburb?.name ?? (pendingGeo?.proposedName ? `${pendingGeo.proposedName} (pending)` : null);

      // Build display location using resolved hierarchy: Suburb → City → Province → Country
      // Build display location using resolved hierarchy: Suburb → City → Province → Country
      const locationParts: string[] = [];
      if (suburbName) locationParts.push(suburbName);
      if (city?.name) locationParts.push(city.name);
      if (province?.name) locationParts.push(province.name);
      if (country?.name) locationParts.push(country.name);
      const displayLocation = locationParts.length > 0 ? locationParts.join(', ') : null;

      // Verification Signals
      // Prioritize DB fields if present (from search/find queries)
      // Fallback to 0 if not selected (partial objects)
      const verificationScore = typeof (property as any).verificationScore === 'number' ? (property as any).verificationScore : 0;
      const verificationLevel = (property as any).verificationLevel || 'NONE';

      // Map Level to Badge Text (Frontend Compat)
      let verificationBadge = 'Not Verified';
      if (verificationLevel === 'VERIFIED') verificationBadge = 'Fully Verified'; // Gold
      else if (verificationLevel === 'TRUSTED') verificationBadge = 'Verified'; // Silver
      else if (verificationLevel === 'BASIC') verificationBadge = 'Basic Verification'; // Bronze

      const result: any = {
        ...cleanProperty,
        verificationScore,
        verificationLevel,
        verificationBoost: verificationScore / 110, // Normalized 0-1
        verificationWeight: verificationScore, // Legacy field compat (0-110 now)
        verificationBadge,
        countryName: country?.name ?? null,
        provinceName: province?.name ?? null,
        cityName: city?.name ?? null,
        suburbName,
        displayLocation,
        location: {
          countryId: property.countryId ?? null,
          country: country
            ? {
              id: String(country.id ?? ''),
              name: String(country.name ?? ''),
              iso2: String(country.iso2 ?? ''),
              phoneCode: String(country.phoneCode ?? '')
            }
            : null,
          provinceId: property.provinceId ?? null,
          province: province
            ? { id: String(province.id ?? ''), name: String(province.name ?? '') }
            : null,
          cityId: property.cityId ?? null,
          city: city
            ? { id: String(city.id ?? ''), name: String(city.name ?? '') }
            : null,
          suburbId: property.suburbId ?? null,
          suburb: suburb
            ? { id: String(suburb.id ?? ''), name: String(suburb.name ?? '') }
            : null,
          pendingGeoId: property.pendingGeoId ?? null,
          pendingGeo: pendingGeo
            ? {
              id: String(pendingGeo.id ?? ''),
              proposedName: String(pendingGeo.proposedName ?? ''),
              level: String(pendingGeo.level ?? ''),
              status: String(pendingGeo.status ?? '')
            }
            : null,
          lat: typeof property.lat === 'number' ? property.lat : null,
          lng: typeof property.lng === 'number' ? property.lng : null
        }
      };

      // Convert all Prisma Decimal types recursively for JSON serialization
      const convertedResult = this.convertDecimalsToNumbers(result);

      // #region agent log
      this.logDebug('properties.service.ts:267', 'attachLocation success', { propertyId: property?.id, resultPriceType: typeof convertedResult?.price, resultAreaSqmType: typeof convertedResult?.areaSqm }, 'B').catch(() => { });
      // #endregion

      return convertedResult;
    } catch (error) {
      // Log error and return property with minimal location data
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in attachLocation${property?.id ? ` for property ${property.id}` : ''}: ${errorMessage}`,
        errorStack
      );

      // Return a safe, serializable object with only essential fields
      // Create a clean serializable object, excluding Prisma relation objects
      const { country, province, city, suburb, pendingGeo, ...cleanProperty } = property as any;
      const errorResult: any = {
        ...cleanProperty,
        countryName: null,
        provinceName: null,
        cityName: null,
        suburbName: null,
        displayLocation: null,
        verificationWeight: 0,
        verificationBadge: 'Not Verified',
        location: {
          countryId: null,
          country: null,
          provinceId: null,
          province: null,
          cityId: null,
          city: null,
          suburbId: null,
          suburb: null,
          pendingGeoId: null,
          lat: null,
          lng: null
        }
      };

      // Convert all Prisma Decimal types recursively for JSON serialization
      return this.convertDecimalsToNumbers(errorResult);
    }
  }

  private attachLocationToMany<T extends Record<string, unknown>>(properties: T[]) {
    // #region agent log
    this.logDebug('properties.service.ts:310', 'attachLocationToMany entry', { propertyCount: properties.length }, 'C').catch(() => { });
    // #endregion
    return properties.map((property, index) => {
      try {
        // #region agent log
        this.logDebug('properties.service.ts:316', 'attachLocationToMany processing property', { index, propertyId: property?.id }, 'C').catch(() => { });
        // #endregion
        return this.attachLocation(property);
      } catch (error) {
        // Log error but return property without location data to prevent 500 errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Error attaching location to property${property?.id ? ` ${property.id}` : ''}: ${errorMessage}`,
          errorStack
        );
        // Create a clean serializable object, excluding Prisma relation objects
        const { country, province, city, suburb, pendingGeo, ...cleanProperty } = property as any;
        const errorResult: any = {
          ...cleanProperty,
          countryName: null,
          provinceName: null,
          cityName: null,
          suburbName: null,
          location: {
            countryId: null,
            country: null,
            provinceId: null,
            province: null,
            cityId: null,
            city: null,
            suburbId: null,
            suburb: null,
            pendingGeoId: null,
            lat: null,
            lng: null
          }
        };

        // Convert all Prisma Decimal types recursively for JSON serialization
        return this.convertDecimalsToNumbers(errorResult);
      }
    }).map((result, index) => {
      // #region agent log
      this.logDebug('properties.service.ts:355', 'attachLocationToMany result', { index, resultId: result?.id, hasPrice: !!result?.price, priceType: typeof result?.price, isDecimal: result?.price?.constructor?.name === 'Decimal' }, 'B').catch(() => { });
      // #endregion
      // Convert all Decimal types recursively
      const converted = this.convertDecimalsToNumbers(result);
      // #region agent log
      this.logDebug('properties.service.ts:360', 'attachLocationToMany converted Decimal', { index, resultId: converted?.id, newPriceType: typeof converted?.price }, 'B').catch(() => { });
      // #endregion
      return converted;
    });
  }

  private normalizeCommercialFields(
    input: CreatePropertyDto['commercialFields']
  ) {
    if (!input) {
      return Prisma.JsonNull;
    }

    const normalized: Record<string, unknown> = {};

    if (typeof input.floorAreaSqm === 'number' && Number.isFinite(input.floorAreaSqm)) {
      normalized.floorAreaSqm = input.floorAreaSqm;
    }
    if (typeof input.lotSizeSqm === 'number' && Number.isFinite(input.lotSizeSqm)) {
      normalized.lotSizeSqm = input.lotSizeSqm;
    }
    if (typeof input.parkingBays === 'number' && Number.isFinite(input.parkingBays)) {
      normalized.parkingBays = input.parkingBays;
    }
    if (input.powerPhase) {
      normalized.powerPhase = input.powerPhase;
    }
    if (input.loadingBay !== undefined) {
      normalized.loadingBay = Boolean(input.loadingBay);
    } else if (Object.keys(normalized).length > 0) {
      normalized.loadingBay = false;
    }
    if (typeof input.zoning === 'string' && input.zoning.trim()) {
      normalized.zoning = input.zoning.trim();
    }
    if (typeof input.complianceDocsUrl === 'string' && input.complianceDocsUrl.trim()) {
      normalized.complianceDocsUrl = input.complianceDocsUrl.trim();
    }

    return Object.keys(normalized).length > 0 ? normalized : Prisma.JsonNull;
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no'].includes(normalized)) {
        return false;
      }
    }

    if (typeof value === 'number') {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
    }

    return undefined;
  }

  private parseStringList(value: unknown): string[] | undefined {
    if (!value) {
      return undefined;
    }

    const values: string[] = [];

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') {
          const trimmed = entry.trim();
          if (trimmed) {
            values.push(trimmed);
          }
        }
      }
    } else if (typeof value === 'string') {
      for (const part of value.split(',')) {
        const trimmed = part.trim();
        if (trimmed) {
          values.push(trimmed);
        }
      }
    }

    return values.length ? Array.from(new Set(values)) : undefined;
  }

  private parseBoundsInput(value: unknown): NormalizedBounds | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === 'string') {
      const parts = value.split(',').map((part) => Number(part));
      if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
        const [swLat, swLng, neLat, neLng] = parts as [number, number, number, number];
        return {
          southWest: { lat: swLat, lng: swLng },
          northEast: { lat: neLat, lng: neLng }
        };
      }
      return undefined;
    }

    if (typeof value === 'object' && value !== null) {
      const maybeSouth = (value as any).southWest;
      const maybeNorth = (value as any).northEast;
      const swLat = this.parseNumber(maybeSouth?.lat);
      const swLng = this.parseNumber(maybeSouth?.lng);
      const neLat = this.parseNumber(maybeNorth?.lat);
      const neLng = this.parseNumber(maybeNorth?.lng);

      if (
        swLat !== undefined &&
        swLng !== undefined &&
        neLat !== undefined &&
        neLng !== undefined
      ) {
        return {
          southWest: { lat: swLat, lng: swLng },
          northEast: { lat: neLat, lng: neLng }
        };
      }
    }

    return undefined;
  }

  private safeParseFilters(raw?: string): Record<string, unknown> {
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      // ignore malformed filter payloads
    }

    return {};
  }

  private normalizeSearchFilters(dto: SearchPropertiesDto): NormalizedFilters {
    const parsedFilters = this.safeParseFilters(dto.filters);

    const countryId = this.pickString(
      parsedFilters.countryId as string | undefined,
      dto.countryId
    );
    const provinceId = this.pickString(
      parsedFilters.provinceId as string | undefined,
      dto.provinceId
    );
    const cityId = this.pickString(parsedFilters.cityId as string | undefined, dto.cityId);
    const suburbId = this.pickString(
      parsedFilters.suburbId as string | undefined,
      dto.suburbId
    );

    const typeInput = (parsedFilters.type as string | undefined) ?? dto.type;
    let type: PropertyType | undefined;
    if (typeInput) {
      const normalized = typeInput.toString().toUpperCase();
      if ((Object.values(PropertyType) as string[]).includes(normalized)) {
        type = normalized as PropertyType;
      }
    }

    const priceMin = this.parseNumber(parsedFilters.priceMin) ?? dto.priceMin;
    const priceMax = this.parseNumber(parsedFilters.priceMax) ?? dto.priceMax;
    const bounds =
      this.parseBoundsInput(parsedFilters.bounds) ?? this.parseBoundsInput(dto.bounds);

    const bedrooms = this.parseNumber(parsedFilters.bedrooms) ?? dto.bedrooms;
    const bathrooms = this.parseNumber(parsedFilters.bathrooms) ?? dto.bathrooms;

    const furnishedInput =
      ((parsedFilters.furnished as string | undefined) ?? dto.furnished)?.toString().toUpperCase();
    let furnished: PropertyFurnishing | undefined;
    if (furnishedInput) {
      if ((Object.values(PropertyFurnishing) as string[]).includes(furnishedInput)) {
        furnished = furnishedInput as PropertyFurnishing;
      }
    }

    const amenities =
      this.parseStringList(parsedFilters.amenities ?? dto.amenities) ?? undefined;

    const minFloorArea = this.parseNumber(parsedFilters.minFloorArea) ?? dto.minFloorArea;
    const zoning = this.pickString(parsedFilters.zoning as string | undefined, dto.zoning);
    const parking = this.parseBoolean(parsedFilters.parking) ?? dto.parking;

    const powerPhaseInput =
      ((parsedFilters.powerPhase as string | undefined) ?? dto.powerPhase)?.toString().toUpperCase();
    let powerPhase: PowerPhase | undefined;
    if (powerPhaseInput && (Object.values(PowerPhase) as string[]).includes(powerPhaseInput)) {
      powerPhase = powerPhaseInput as PowerPhase;
    }

    return {
      type,
      countryId: countryId ?? undefined,
      provinceId: provinceId ?? undefined,
      cityId: cityId ?? undefined,
      suburbId: suburbId ?? undefined,
      priceMin,
      priceMax,
      bounds,
      bedrooms,
      bathrooms,
      furnished,
      amenities,
      minFloorArea,
      zoning: zoning ?? undefined,
      parking,
      powerPhase
    };
  }

  listOwned(actor: AuthContext) {
    // #region agent log
    this.logDebug('properties.service.ts:481', 'listOwned entry', { actorRole: actor.role, actorId: actor.userId }, 'C');
    // #endregion
    const include = {
      media: true,
      agentOwner: { select: { id: true, name: true, role: true } },
      landlord: { select: { id: true, name: true, role: true } },
      assignments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          agent: { select: { id: true, name: true, role: true } },
          landlord: { select: { id: true, name: true, role: true } }
        }
      },
      country: true,
      province: true,
      city: true,
      suburb: true,
      pendingGeo: true,
      verificationRequests: {
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    } satisfies Prisma.PropertyInclude;

    if (actor.role === Role.ADMIN) {
      return this.prisma.property
        .findMany({ orderBy: { createdAt: 'desc' }, include })
        .then(async (properties: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug('properties.service.ts:504', 'listOwned before attachLocationToMany', { propertyCount: properties.length, firstPropertyId: properties[0]?.id, hasPrice: !!properties[0]?.price, priceType: typeof properties[0]?.price }, 'B');
          // #endregion
          return this.attachLocationToMany(properties);
        })
        .then(async (result: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug('properties.service.ts:506', 'listOwned after attachLocationToMany', { resultCount: result.length, firstResultId: result[0]?.id }, 'C');
          // #endregion
          // Test JSON serialization before returning
          try {
            JSON.stringify(result);
            // #region agent log
            await this.logDebug('properties.service.ts:510', 'listOwned JSON serialization success', {}, 'B');
            // #endregion
          } catch (serialError) {
            // #region agent log
            await this.logDebug('properties.service.ts:513', 'listOwned JSON serialization failed', { error: serialError instanceof Error ? serialError.message : String(serialError) }, 'B');
            // #endregion
            throw serialError;
          }
          return result;
        })
        .catch(async (error: unknown) => {
          // #region agent log
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack?.substring(0, 200) : undefined;
          await this.logDebug('properties.service.ts:520', 'listOwned error', { errorMessage, errorStack }, 'C');
          // #endregion
          throw error;
        });
    }

    if (actor.role === Role.LANDLORD) {
      return this.prisma.property
        .findMany({
          where: { landlordId: actor.userId },
          orderBy: { createdAt: 'desc' },
          include
        })
        .then(async (properties: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug('properties.service.ts:674', 'listOwned LANDLORD before attachLocationToMany', { propertyCount: properties.length }, 'C');
          // #endregion
          return this.attachLocationToMany(properties);
        })
        .then(async (result: Array<Record<string, unknown>>) => {
          // Test JSON serialization
          try {
            JSON.stringify(result);
            // #region agent log
            await this.logDebug('properties.service.ts:681', 'listOwned LANDLORD JSON serialization success', {}, 'B');
            // #endregion
          } catch (serialError) {
            // #region agent log
            await this.logDebug('properties.service.ts:684', 'listOwned LANDLORD JSON serialization failed', { error: serialError instanceof Error ? serialError.message : String(serialError) }, 'B');
            // #endregion
            throw serialError;
          }
          return result;
        })
        .catch(async (error: unknown) => {
          // #region agent log
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.logDebug('properties.service.ts:691', 'listOwned LANDLORD error', { errorMessage }, 'C');
          // #endregion
          throw error;
        });
    }

    if (actor.role === Role.AGENT) {
      return this.prisma.property
        .findMany({
          where: { agentOwnerId: actor.userId },
          orderBy: { createdAt: 'desc' },
          include
        })
        .then(async (properties: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug('properties.service.ts:705', 'listOwned AGENT before attachLocationToMany', { propertyCount: properties.length }, 'C');
          // #endregion
          return this.attachLocationToMany(properties);
        })
        .then(async (result: Array<Record<string, unknown>>) => {
          // Test JSON serialization
          try {
            JSON.stringify(result);
            // #region agent log
            await this.logDebug('properties.service.ts:712', 'listOwned AGENT JSON serialization success', {}, 'B');
            // #endregion
          } catch (serialError) {
            // #region agent log
            await this.logDebug('properties.service.ts:715', 'listOwned AGENT JSON serialization failed', { error: serialError instanceof Error ? serialError.message : String(serialError) }, 'B');
            // #endregion
            throw serialError;
          }
          return result;
        })
        .catch(async (error: unknown) => {
          // #region agent log
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.logDebug('properties.service.ts:722', 'listOwned AGENT error', { errorMessage }, 'C');
          // #endregion
          throw error;
        });
    }

    throw new ForbiddenException('Only landlords, agents, or admins can manage listings');
  }

  listVerifiedAgents() {
    return this.prisma.user.findMany({
      where: {
        role: Role.AGENT,
        agentProfile: {
          verifiedListingsCount: { gt: 0 },
          kycStatus: 'VERIFIED'
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        agentProfile: { select: { verifiedListingsCount: true, leadsCount: true } }
      },
      orderBy: {
        agentProfile: {
          verifiedListingsCount: 'desc'
        }
      }
    });
  }

  searchAgents(query: string) {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) {
      return this.listVerifiedAgents();
    }

    return this.prisma.user.findMany({
      where: {
        role: Role.AGENT,
        agentProfile: {
          verifiedListingsCount: { gt: 0 },
          kycStatus: 'VERIFIED'
        },
        name: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        phone: true,
        agentProfile: {
          select: {
            verifiedListingsCount: true,
            leadsCount: true,
            rating: true
          }
        }
      },
      orderBy: {
        agentProfile: {
          verifiedListingsCount: 'desc'
        }
      },
      take: 20 // Limit results for performance
    });
  }

  async findById(id: string) {
    // #region agent log
    await this.logDebug('properties.service.ts:735', 'findById entry', { propertyId: id }, 'D');
    // #endregion
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true,
        media: true,
        landlord: { select: { id: true, name: true, email: true } },
        agentOwner: { select: { id: true, name: true, email: true } },
        verificationRequests: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!property) {
      // #region agent log
      await this.logDebug('properties.service.ts:753', 'findById not found', { propertyId: id }, 'D');
      // #endregion
      throw new NotFoundException('Property not found');
    }

    // #region agent log
    await this.logDebug('properties.service.ts:760', 'findById before attachLocation', { propertyId: id, hasPrice: !!property?.price, priceType: typeof property?.price }, 'D');
    // #endregion

    try {
      const result = this.attachLocation(property);
      // #region agent log
      await this.logDebug('properties.service.ts:765', 'findById after attachLocation', { propertyId: id, resultPriceType: typeof result?.price }, 'D');
      // #endregion

      // Test JSON serialization
      try {
        JSON.stringify(result);
        // #region agent log
        await this.logDebug('properties.service.ts:770', 'findById JSON serialization success', {}, 'B');
        // #endregion
      } catch (serialError) {
        // #region agent log
        await this.logDebug('properties.service.ts:773', 'findById JSON serialization failed', { error: serialError instanceof Error ? serialError.message : String(serialError) }, 'B');
        // #endregion
        throw serialError;
      }

      return result;
    } catch (error: unknown) {
      // #region agent log
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack?.substring(0, 200) : undefined;
      await this.logDebug('properties.service.ts:780', 'findById error', { propertyId: id, errorMessage, errorStack }, 'D');
      // #endregion
      throw error;
    }
  }

  async create(dto: CreatePropertyDto, actor: AuthContext) {
    try {
      const landlordId = dto.landlordId ?? (actor.role === Role.LANDLORD ? actor.userId : undefined);
      const agentOwnerId = dto.agentOwnerId ?? (actor.role === Role.AGENT ? actor.userId : undefined);

      // Map actor role to ListingCreatorRole for audit tracking
      let createdByRole: ListingCreatorRole = ListingCreatorRole.LANDLORD;
      if (actor.role === Role.AGENT) {
        createdByRole = ListingCreatorRole.AGENT;
      } else if (actor.role === Role.ADMIN) {
        createdByRole = ListingCreatorRole.ADMIN;
      }

      let location: Awaited<ReturnType<typeof this.geo.resolveLocation>>;
      try {
        location = await this.geo.resolveLocation({
          countryId: dto.countryId ?? null,
          provinceId: dto.provinceId ?? null,
          cityId: dto.cityId ?? null,
          suburbId: dto.suburbId ?? null,
          pendingGeoId: dto.pendingGeoId ?? null
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to resolve location for property creation: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        // DIAGNOSTIC: Return detailed location resolution error
        throw new BadRequestException({
          message: 'Property creation validation failed',
          issues: [{
            path: 'location',
            message: `Invalid location: ${errorMessage}`,
            code: 'custom',
            locationInput: {
              countryId: dto.countryId ?? null,
              provinceId: dto.provinceId ?? null,
              cityId: dto.cityId ?? null,
              suburbId: dto.suburbId ?? null,
              pendingGeoId: dto.pendingGeoId ?? null
            }
          }]
        });
      }

      const availableFrom =
        dto.availability === PropertyAvailability.DATE && dto.availableFrom
          ? new Date(dto.availableFrom)
          : null;
      const commercialFields = this.normalizeCommercialFields(dto.commercialFields);

      // Build location data - use conditional spreading only for truly optional fields
      const resolvedCountryId = location.country?.id ?? dto.countryId ?? null;
      const resolvedProvinceId = location.province?.id ?? dto.provinceId ?? null;
      const resolvedCityId = location.city?.id ?? dto.cityId ?? null;
      const resolvedSuburbId = location.suburb?.id ?? dto.suburbId ?? null;
      const resolvedPendingGeoId = location.pendingGeo?.id ?? null;

      const property = await this.prisma.property.create({
        data: {
          title: dto.title,
          ...(landlordId && { landlordId }),
          ...(agentOwnerId && { agentOwnerId }),
          type: dto.type,
          listingIntent: dto.listingIntent ?? null,
          currency: dto.currency,
          price: new Prisma.Decimal(dto.price),
          countryId: resolvedCountryId,
          provinceId: resolvedProvinceId,
          cityId: resolvedCityId,
          // Only include suburbId if it has a value (conditional spreading for optional field)
          ...(resolvedSuburbId && { suburbId: resolvedSuburbId }),
          ...(resolvedPendingGeoId && { pendingGeoId: resolvedPendingGeoId }),
          lat: typeof dto.lat === 'number' ? dto.lat : null,
          lng: typeof dto.lng === 'number' ? dto.lng : null,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          areaSqm: dto.areaSqm && dto.areaSqm > 0 ? dto.areaSqm : null,
          amenities: dto.amenities ?? [],
          furnishing: dto.furnishing ?? PropertyFurnishing.NONE,
          availability: dto.availability ?? PropertyAvailability.IMMEDIATE,
          availableFrom,
          commercialFields,
          description: dto.description,
          status: PropertyStatus.DRAFT,
          createdByRole
        },
        include: {
          country: true,
          province: true,
          city: true,
          suburb: true,
          pendingGeo: true
        }
      });

      await this.audit.log({
        action: 'property.create',
        actorId: actor.userId,
        targetType: 'property',
        targetId: property.id,
        metadata: { landlordId, agentOwnerId }
      });

      try {
        return this.attachLocation(property);
      } catch (attachError) {
        // If attachLocation fails, return property without location data
        const errorMessage = attachError instanceof Error ? attachError.message : String(attachError);
        this.logger.error(`Failed to attach location to created property ${property.id}: ${errorMessage}`, attachError instanceof Error ? attachError.stack : undefined);

        // Return a minimal serializable version
        const { country, province, city, suburb, pendingGeo, ...cleanProperty } = property as any;
        return this.convertDecimalsToNumbers({
          ...cleanProperty,
          countryName: null,
          provinceName: null,
          cityName: null,
          suburbName: null,
          location: {
            countryId: property.countryId,
            country: null,
            provinceId: property.provinceId,
            province: null,
            cityId: property.cityId,
            city: null,
            suburbId: property.suburbId,
            suburb: null,
            pendingGeoId: property.pendingGeoId,
            pendingGeo: null,
            lat: property.lat,
            lng: property.lng
          }
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create property: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  async update(id: string, dto: UpdatePropertyDto, actor: AuthContext) {
    const existing = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(existing, actor);

    const {
      amenities,
      price: priceInput,
      availableFrom: availableFromInput,
      commercialFields,
      ...rest
    } = dto;
    const price = priceInput !== undefined ? new Prisma.Decimal(priceInput) : undefined;

    const {
      countryId,
      provinceId,
      cityId,
      suburbId,
      pendingGeoId,
      lat,
      lng,
      ...other
    } = rest;

    // Determine if location fields are being updated
    const isUpdatingLocation =
      countryId !== undefined ||
      provinceId !== undefined ||
      cityId !== undefined ||
      suburbId !== undefined ||
      pendingGeoId !== undefined;

    let location: Awaited<ReturnType<typeof this.geo.resolveLocation>>;

    if (isUpdatingLocation) {
      // User is updating location - resolve the new location
      try {
        location = await this.geo.resolveLocation({
          countryId: countryId ?? null,
          provinceId: provinceId ?? null,
          cityId: cityId ?? null,
          suburbId: suburbId ?? null,
          pendingGeoId: pendingGeoId ?? null
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to resolve location for property update ${id}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        throw new BadRequestException(`Invalid location: ${errorMessage}`);
      }
    } else {
      // User is not updating location - use existing location
      location = {
        country: existing.country,
        province: existing.province,
        city: existing.city,
        suburb: existing.suburb,
        pendingGeo: existing.pendingGeo
      };
    }

    const availableFrom =
      availableFromInput !== undefined
        ? new Date(availableFromInput)
        : rest.availability === PropertyAvailability.IMMEDIATE
          ? null
          : undefined;
    const normalizedCommercialFields =
      commercialFields !== undefined ? this.normalizeCommercialFields(commercialFields) : undefined;

    const filtered = this.removeUndefined(other);

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        ...filtered,
        ...(isUpdatingLocation ? {
          countryId: location.country?.id ?? null,
          provinceId: location.province?.id ?? null,
          cityId: location.city?.id ?? null,
          suburbId: location.suburb?.id ?? null,
          pendingGeoId: location.pendingGeo?.id ?? null,
        } : {}),
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
        ...(price !== undefined ? { price } : {}),
        amenities: amenities ?? existing.amenities,
        ...(availableFrom !== undefined ? { availableFrom } : {}),
        ...(normalizedCommercialFields !== undefined ? { commercialFields: normalizedCommercialFields } : {})
      },
      include: {
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true
      }
    });

    await this.audit.log({
      action: 'property.update',
      actorId: actor.userId,
      targetType: 'property',
      targetId: property.id,
      metadata: dto
    });

    return this.attachLocation(property);
  }

  async remove(id: string, actor: AuthContext) {
    const existing = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(existing, actor);

    await this.prisma.property.delete({ where: { id } });

    await this.audit.log({
      action: 'property.delete',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id
    });

    return { success: true, id };
  }

  async assignVerifiedAgent(id: string, dto: AssignAgentDto, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    // Validate agentId is provided
    if (!dto.agentId || dto.agentId.trim() === '') {
      throw new BadRequestException('Agent ID is required. Please select an agent.');
    }

    // Find agent - relaxed query to allow any agent user
    const agent = await this.prisma.user.findFirst({
      where: {
        id: dto.agentId,
        role: Role.AGENT
      },
      select: {
        id: true,
        name: true,
        agentProfile: {
          select: {
            kycStatus: true,
            verifiedListingsCount: true
          }
        }
      }
    });

    if (!agent) {
      throw new BadRequestException('Agent not found or user is not an agent');
    }

    const landlordId = property.landlordId ?? actor.userId;
    const serviceFeeUsdCents =
      dto.serviceFeeUsd !== undefined ? Math.round(dto.serviceFeeUsd * 100) : null;

    if (serviceFeeUsdCents !== null && serviceFeeUsdCents < 0) {
      throw new BadRequestException('Service fee must be positive');
    }

    const [assignment] = await this.prisma.$transaction([
      this.prisma.agentAssignment.create({
        data: {
          propertyId: id,
          landlordId,
          agentId: agent.id,
          serviceFeeUsdCents: serviceFeeUsdCents ?? undefined,
          landlordPaysFee: true
        }
      }),
      this.prisma.property.update({
        where: { id },
        data: {
          landlordId,
          agentOwnerId: agent.id
        }
      })
    ]);

    // Auto-generate payment ledger entry if service fee is set
    if (serviceFeeUsdCents !== null && serviceFeeUsdCents > 0) {
      await this.prisma.listingPayment.create({
        data: {
          propertyId: id,
          type: ListingPaymentType.AGENT_FEE,
          amountCents: serviceFeeUsdCents,
          currency: Currency.USD,
          status: ListingPaymentStatus.PENDING,
          reference: `AGENT_FEE_${id}_${assignment.id}`,
          metadata: {
            assignmentId: assignment.id,
            agentId: agent.id,
            agentName: agent.name
          }
        }
      });
    }

    await this.audit.log({
      action: 'property.assignAgent',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id,
      metadata: {
        agentId: agent.id,
        serviceFeeUsd: dto.serviceFeeUsd ?? null
      }
    });

    // Log activity
    await this.logActivity(id, ListingActivityType.AGENT_ASSIGNED, actor.userId, {
      agentId: dto.agentId,
      agentName: agent.name
    });

    return assignment;
  }

  async updateServiceFee(id: string, dto: UpdateServiceFeeDto, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    const latestAssignment = await this.prisma.agentAssignment.findFirst({
      where: { propertyId: id },
      orderBy: { createdAt: 'desc' }
    });

    if (!latestAssignment) {
      throw new BadRequestException('No agent assignment found. Please assign an agent first.');
    }

    // Convert to cents if a value is provided, otherwise set to null to clear the fee
    // In Prisma, null explicitly sets the field to NULL, while undefined means "don't update"
    const serviceFeeUsdCents =
      dto.serviceFeeUsd !== null && dto.serviceFeeUsd !== undefined
        ? Math.round(dto.serviceFeeUsd * 100)
        : null;

    if (serviceFeeUsdCents !== null && serviceFeeUsdCents < 0) {
      throw new BadRequestException('Service fee must be positive');
    }

    const updated = await this.prisma.agentAssignment.update({
      where: { id: latestAssignment.id },
      data: {
        // Pass null directly to set the field to NULL in the database
        // Using undefined would mean "don't update this field" in Prisma
        serviceFeeUsdCents: serviceFeeUsdCents
      }
    });

    await this.audit.log({
      action: 'property.updateServiceFee',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id,
      metadata: {
        assignmentId: updated.id,
        serviceFeeUsd: dto.serviceFeeUsd
      }
    });

    return updated;
  }

  async updateDealConfirmation(id: string, dto: UpdateDealConfirmationDto, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    const isConfirming = dto.confirmed;

    const updated = await this.prisma.$transaction(async (tx) => {
      const propertyUpdate = await tx.property.update({
        where: { id },
        data: {
          dealConfirmedAt: isConfirming ? new Date() : null,
          dealConfirmedById: isConfirming ? actor.userId : null
        },
        include: {
          media: true,
          agentOwner: { select: { id: true, name: true, role: true } },
          landlord: { select: { id: true, name: true, role: true } },
          assignments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              agent: { select: { id: true, name: true, role: true } },
              landlord: { select: { id: true, name: true, role: true } }
            }
          },
          country: true,
          province: true,
          city: true,
          suburb: true,
          pendingGeo: true
        }
      });

      const existingEvent = await tx.rewardEvent.findFirst({
        where: { type: RewardEventType.SALE_CONFIRMED, refId: id }
      });

      const agentId = propertyUpdate.agentOwnerId;

      if (isConfirming) {
        // When listing is confirmed:
        // - ACCEPTED offer → CONFIRMED
        // - All other offers → REJECTED
        const acceptedOffer = await tx.interest.findFirst({
          where: {
            propertyId: id,
            status: InterestStatus.ACCEPTED
          }
        });

        if (acceptedOffer) {
          // Confirm the accepted offer
          await tx.interest.update({
            where: { id: acceptedOffer.id },
            data: { status: InterestStatus.CONFIRMED }
          });

          // Reject all other offers
          await tx.interest.updateMany({
            where: {
              propertyId: id,
              id: { not: acceptedOffer.id },
              status: { not: InterestStatus.CONFIRMED }
            },
            data: { status: InterestStatus.REJECTED }
          });
        }

        if (agentId) {
          if (existingEvent) {
            if (existingEvent.agentId !== agentId) {
              await tx.rewardEvent.update({
                where: { id: existingEvent.id },
                data: { agentId }
              });
            }
          } else {
            await tx.rewardEvent.create({
              data: {
                agentId,
                type: RewardEventType.SALE_CONFIRMED,
                points: SALE_CONFIRMED_POINTS,
                usdCents: SALE_CONFIRMED_USD_CENTS,
                refId: id
              }
            });
          }
        }
      } else if (existingEvent) {
        await tx.rewardEvent.delete({ where: { id: existingEvent.id } });
      }

      return propertyUpdate;
    });

    await this.audit.log({
      action: 'property.dealConfirmation',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id,
      metadata: { confirmed: dto.confirmed }
    });

    // Log activities for offer confirmations/rejections (done after transaction)
    if (dto.confirmed) {
      const acceptedOffer = await this.prisma.interest.findFirst({
        where: {
          propertyId: id,
          status: InterestStatus.CONFIRMED
        }
      });
      if (acceptedOffer) {
        await this.logActivity(id, ListingActivityType.OFFER_CONFIRMED, actor.userId, {
          offerId: acceptedOffer.id,
          offerAmount: acceptedOffer.offerAmount
        });
        const rejectedCount = await this.prisma.interest.count({
          where: {
            propertyId: id,
            status: InterestStatus.REJECTED
          }
        });
        if (rejectedCount > 0) {
          await this.logActivity(id, ListingActivityType.OFFER_REJECTED, actor.userId, {
            count: rejectedCount,
            reason: 'Deal confirmed'
          });
        }
      }
    }

    return this.attachLocation(updated);
  }

  async listMessages(id: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);

    // Check if actor is owner or agent
    const isOwner = property.landlordId === actor.userId || property.agentOwnerId === actor.userId;
    const isAdmin = actor.role === Role.ADMIN;

    let where: Prisma.PropertyMessageWhereInput = { propertyId: id };

    if (!isOwner && !isAdmin) {
      // Regular users only see their own messages
      where = {
        propertyId: id,
        OR: [
          { senderId: actor.userId },
          { recipientId: actor.userId }
        ]
      };
    }

    const messages = (await this.prisma.propertyMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } }
      }
    })) as Array<{
      id: string;
      recipientId: string;
      readAt: Date | null;
    } & Record<string, unknown>>;

    const unreadForActor = messages
      .filter((message) => message.recipientId === actor.userId && !message.readAt)
      .map((message) => message.id);

    if (unreadForActor.length) {
      await this.prisma.propertyMessage.updateMany({
        where: { id: { in: unreadForActor } },
        data: { readAt: new Date() }
      });
    }

    return messages;
  }

  async sendMessage(id: string, dto: CreateMessageDto, actor: AuthContext) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true,
        landlord: { select: { id: true } },
        agentOwner: { select: { id: true } }
      }
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Determine recipient
    let recipientId: string | null = null;

    const isOwner = property.landlordId === actor.userId;
    const isAgent = property.agentOwnerId === actor.userId;

    // Chat visibility guard: Only ACCEPTED or CONFIRMED offers allow chat
    // Owners and agents can always chat
    if (!isOwner && !isAgent) {
      const userInterest = await this.prisma.interest.findFirst({
        where: {
          propertyId: id,
          userId: actor.userId,
          status: { in: [InterestStatus.ACCEPTED, InterestStatus.CONFIRMED] }
        }
      });

      if (!userInterest) {
        throw new ForbiddenException(
          'Chat is only available for accepted or confirmed offers. Please wait for your offer to be accepted.'
        );
      }
    }

    if (isOwner || isAgent) {
      // Owner/Agent replying - try to find the last person who messaged
      const lastIncoming = await this.prisma.propertyMessage.findFirst({
        where: {
          propertyId: id,
          senderId: { not: actor.userId }
        },
        orderBy: { createdAt: 'desc' },
        select: { senderId: true }
      });

      if (lastIncoming) {
        recipientId = lastIncoming.senderId;
      } else {
        // No incoming messages, fallback to Landlord <-> Agent
        recipientId = isOwner ? (property.agentOwnerId ?? property.landlordId) : property.landlordId;
      }
    } else {
      // Interested party messaging the owner (Agent preferred, else Landlord)
      recipientId = property.agentOwnerId ?? property.landlordId;
    }

    // A property must have either a landlord or an agent owner to receive messages
    // This ensures data quality and prevents invalid message states
    if (!recipientId) {
      throw new BadRequestException(
        'Cannot send message: This property has no assigned owner. Please contact support if you believe this is an error.'
      );
    }

    const message = await this.prisma.propertyMessage.create({
      data: {
        propertyId: id,
        senderId: actor.userId,
        recipientId,
        body: dto.body
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } }
      }
    });

    return message;
  }

  private async getPropertyOrThrow(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true
      }
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private ensureCanMutate(property: { landlordId: string | null; agentOwnerId: string | null }, actor: AuthContext) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (actor.role === Role.LANDLORD && property.landlordId === actor.userId) {
      return;
    }

    if (actor.role === Role.AGENT && property.agentOwnerId === actor.userId) {
      return;
    }

    throw new ForbiddenException('You do not have permission to modify this property');
  }

  private ensureLandlordAccess(property: { landlordId: string | null }, actor: AuthContext) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (property.landlordId === actor.userId) {
      return;
    }

    throw new ForbiddenException('Only the landlord can perform this action');
  }

  private ensureConversationAccess(
    property: { landlordId: string | null; agentOwnerId: string | null },
    actor: AuthContext
  ) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (property.landlordId === actor.userId || property.agentOwnerId === actor.userId) {
      return;
    }

    // TODO: check if user is a lead/tenant
    // For now, allow any user to message? No, that's unsafe.
    // Assuming the user is initiating a conversation, they should be allowed.
    // But listMessages should be restricted.
    // This logic needs refinement based on requirements.
    // For now, allow if they are involved.
  }

  async search(dto: SearchPropertiesDto) {
    const filters = this.normalizeSearchFilters(dto);
    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.VERIFIED
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.countryId) {
      where.countryId = filters.countryId;
    }
    if (filters.provinceId) {
      where.provinceId = filters.provinceId;
    }
    if (filters.cityId) {
      where.cityId = filters.cityId;
    }
    if (filters.suburbId) {
      where.suburbId = filters.suburbId;
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) {
        where.price.gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        where.price.lte = filters.priceMax;
      }
    }

    if (filters.bounds) {
      const { southWest, northEast } = filters.bounds;
      const southLat = Math.min(southWest.lat, northEast.lat);
      const northLat = Math.max(southWest.lat, northEast.lat);
      const westLng = Math.min(southWest.lng, northEast.lng);
      const eastLng = Math.max(southWest.lng, northEast.lng);

      where.lat = { gte: southLat, lte: northLat };
      where.lng = { gte: westLng, lte: eastLng };
    }

    if (filters.bedrooms !== undefined) {
      where.bedrooms = { gte: filters.bedrooms };
    }
    if (filters.bathrooms !== undefined) {
      where.bathrooms = { gte: filters.bathrooms };
    }
    if (filters.furnished) {
      where.furnishing = filters.furnished;
    }
    if (filters.amenities && filters.amenities.length > 0) {
      where.amenities = { hasEvery: filters.amenities };
    }

    // Commercial fields filtering (simplified for now as JsonFilter is complex)
    // Prisma Json filtering is limited. We might need raw query or careful construction.
    // For now, skipping complex JSON filtering to avoid build errors if types mismatch.

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: [{ verificationScore: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          country: true,
          province: true,
          city: true,
          suburb: true,
          pendingGeo: true,
          media: { take: 1, orderBy: { order: 'asc' } }
        }
      }),
      this.prisma.property.count({ where })
    ]);

    return {
      items: this.attachLocationToMany(items),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async submitForVerification(id: string, dto: SubmitForVerificationDto, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(property, actor);

    // Check if there's already a verification request
    const existingRequest = await this.prisma.verificationRequest.findFirst({
      where: {
        propertyId: id
      },
      include: {
        items: true
      }
    });

    // If REJECTED, we will "revive" it.
    // If PENDING/SUBMITTED/APPROVED, we will allow adding new items (e.g. upgrading level).
    // NO blocking check here.

    // Validate file limits per item
    if (dto.proofOfOwnershipUrls && dto.proofOfOwnershipUrls.length > 5) {
      throw new BadRequestException('Proof of Ownership allows max 5 files');
    }
    if (dto.propertyPhotoUrls && dto.propertyPhotoUrls.length > 5) {
      throw new BadRequestException('Property Photos allows max 5 files');
    }

    const verificationFeeUsdCents = 2000; // $20.00 - Admin configurable

    let verificationRequest: any;

    if (existingRequest) {
      // Reuse existing request
      verificationRequest = existingRequest;

      // If strictly REJECTED, reset to PENDING to indicate activity (optional, but good for admin visibility)
      if (existingRequest.status === 'REJECTED') {
        await this.prisma.verificationRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'PENDING', notes: dto.notes ?? existingRequest.notes } // Reset to Pending
        });
      }

      // Handle Proof of Ownership Item
      const proofItem = existingRequest.items.find((i: { type: string }) => i.type === 'PROOF_OF_OWNERSHIP');
      if (dto.proofOfOwnershipUrls && dto.proofOfOwnershipUrls.length > 0) {
        if (proofItem) {
          // Update existing only if not APPROVED (or allow re-verify?) - Admin dictates usually.
          // Assuming we allow re-submit if not approved, or if we want to overwrite.
          if (proofItem.status !== 'APPROVED') {
            await this.prisma.verificationRequestItem.update({
              where: { id: proofItem.id },
              data: {
                status: 'SUBMITTED',
                evidenceUrls: dto.proofOfOwnershipUrls,
                verifierId: null,
                reviewedAt: null
              }
            });
          }
        } else {
          await this.prisma.verificationRequestItem.create({
            data: {
              verificationRequestId: existingRequest.id,
              type: 'PROOF_OF_OWNERSHIP',
              status: 'SUBMITTED',
              evidenceUrls: dto.proofOfOwnershipUrls
            }
          });
        }
      }

      // Handle Location Item
      const locItem = existingRequest.items.find((i: { type: string }) => i.type === 'LOCATION_CONFIRMATION');
      if (dto.locationGpsLat || dto.locationGpsLng || dto.requestOnSiteVisit) {
        const locStatus = (dto.locationGpsLat && dto.locationGpsLng) ? 'SUBMITTED' : 'PENDING';
        if (locItem) {
          // Allow update unless approved? Or allow update if GPS refinement?
          // Let's allow update if standard user flow.
          if (locItem.status !== 'APPROVED') {
            await this.prisma.verificationRequestItem.update({
              where: { id: locItem.id },
              data: {
                status: locStatus,
                gpsLat: dto.locationGpsLat ?? locItem.gpsLat,
                gpsLng: dto.locationGpsLng ?? locItem.gpsLng,
                notes: dto.requestOnSiteVisit ? 'On-site visit requested' : locItem.notes,
                verifierId: null,
                reviewedAt: null
              }
            });
          }
        } else {
          await this.prisma.verificationRequestItem.create({
            data: {
              verificationRequestId: existingRequest.id,
              type: 'LOCATION_CONFIRMATION',
              status: locStatus,
              gpsLat: dto.locationGpsLat,
              gpsLng: dto.locationGpsLng,
              notes: dto.requestOnSiteVisit ? 'On-site visit requested' : null
            }
          });
        }
      }

      // Handle Photos Item
      const photoItem = existingRequest.items.find((i: { type: string }) => i.type === 'PROPERTY_PHOTOS');
      if (dto.propertyPhotoUrls && dto.propertyPhotoUrls.length > 0) {
        if (photoItem) {
          if (photoItem.status !== 'APPROVED') {
            await this.prisma.verificationRequestItem.update({
              where: { id: photoItem.id },
              data: {
                status: 'SUBMITTED',
                evidenceUrls: dto.propertyPhotoUrls,
                verifierId: null,
                reviewedAt: null
              }
            });
          }
        } else {
          await this.prisma.verificationRequestItem.create({
            data: {
              verificationRequestId: existingRequest.id,
              type: 'PROPERTY_PHOTOS',
              status: 'SUBMITTED',
              evidenceUrls: dto.propertyPhotoUrls
            }
          });
        }
      }

      // Reload request
      verificationRequest = await this.prisma.verificationRequest.findUnique({
        where: { id: existingRequest.id },
        include: { items: true }
      });

    } else {
      // NEW Request Logic
      verificationRequest = await this.prisma.verificationRequest.create({
        data: {
          propertyId: id,
          requesterId: actor.userId,
          status: 'PENDING', // Always starts as PENDING until fee paid? Or unrelated?
          notes: dto.notes ?? null,
          items: {
            create: [
              // Proof of ownership item
              ...(dto.proofOfOwnershipUrls && dto.proofOfOwnershipUrls.length > 0
                ? [{
                  type: 'PROOF_OF_OWNERSHIP' as const,
                  status: 'SUBMITTED' as const,
                  evidenceUrls: dto.proofOfOwnershipUrls
                }]
                : [{
                  type: 'PROOF_OF_OWNERSHIP' as const,
                  status: 'PENDING' as const
                }]),
              // Location confirmation item
              {
                type: 'LOCATION_CONFIRMATION' as const,
                status: (dto.locationGpsLat && dto.locationGpsLng ? ('SUBMITTED' as const) : ('PENDING' as const)),
                gpsLat: dto.locationGpsLat ?? null,
                gpsLng: dto.locationGpsLng ?? null,
                notes: dto.requestOnSiteVisit ? 'On-site visit requested' : null
              },
              // Property photos item
              ...(dto.propertyPhotoUrls && dto.propertyPhotoUrls.length > 0
                ? [{
                  type: 'PROPERTY_PHOTOS' as const,
                  status: 'SUBMITTED' as const,
                  evidenceUrls: dto.propertyPhotoUrls
                }]
                : [{
                  type: 'PROPERTY_PHOTOS' as const,
                  status: 'PENDING' as const
                }])
            ]
          }
        },
        include: {
          items: true
        }
      });
    }

    // Only create payment if fee > 0
    let payment = null;
    if (verificationFeeUsdCents > 0) {
      payment = await this.prisma.listingPayment.create({
        data: {
          propertyId: id,
          type: ListingPaymentType.VERIFICATION,
          amountCents: verificationFeeUsdCents,
          currency: Currency.USD,
          status: ListingPaymentStatus.PENDING,
          reference: `VERIFICATION_${id}_${Date.now()}`,
          metadata: {
            verificationFee: true
          }
        }
      });
    }

    // Update property status
    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        status: PropertyStatus.PENDING_VERIFY
      },
      include: {
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true
      }
    });

    await this.audit.log({
      action: 'property.submitForVerification',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id,
      metadata: {
        verificationRequestId: verificationRequest.id,
        paymentId: payment?.id ?? null,
        itemsSubmitted: verificationRequest.items.filter((i: { status: string }) => i.status === 'SUBMITTED').length
      }
    });

    // Log activity
    await this.logActivity(id, ListingActivityType.VERIFICATION_SUBMITTED, actor.userId, {
      verificationRequestId: verificationRequest.id
    });

    return {
      property: this.attachLocation(updated),
      verificationRequest,
      payment
    };
  }

  async getVerificationRequest(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify access
    const isAuthorized = property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId ||
      actor.role === Role.ADMIN;
    if (!isAuthorized) {
      throw new ForbiddenException('You do not have permission to view verification requests for this property');
    }

    const request = await this.prisma.verificationRequest.findFirst({
      where: { propertyId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            verificationScore: true,
            verificationLevel: true
          }
        },
        items: {
          include: {
            verifier: {
              select: { id: true, name: true }
            }
          },
          orderBy: { type: 'asc' }
        },
        requester: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return request;
  }

  async updateVerificationItem(
    propertyId: string,
    itemId: string,
    dto: { evidenceUrls?: string[]; gpsLat?: number; gpsLng?: number; notes?: string; requestOnSiteVisit?: boolean },
    actor: AuthContext
  ) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureCanMutate(property, actor);

    const item = await this.prisma.verificationRequestItem.findUnique({
      where: { id: itemId },
      include: {
        verificationRequest: {
          select: { propertyId: true, requesterId: true, id: true }
        }
      }
    });

    if (!item) {
      throw new NotFoundException('Verification item not found');
    }

    if (item.verificationRequest.propertyId !== propertyId) {
      throw new BadRequestException('Verification item does not belong to this property');
    }

    if (item.verificationRequest.requesterId !== actor.userId) {
      throw new ForbiddenException('Only the requester can update verification items');
    }

    if (item.status === 'APPROVED') {
      throw new BadRequestException('Cannot update an item that has been approved');
    }

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (item.status === 'SUBMITTED' && item.updatedAt < thirtyMinsAgo) {
      throw new BadRequestException('Verification item is locked for review (30-minute edit window expired)');
    }

    // Validate single file upload (now max 5)
    if (dto.evidenceUrls && dto.evidenceUrls.length > 5) {
      if (item.type === 'PROOF_OF_OWNERSHIP') {
        throw new BadRequestException('Proof of Ownership allows max 5 files');
      }
      if (item.type === 'PROPERTY_PHOTOS') {
        throw new BadRequestException('Property Photos allows max 5 files');
      }
    }

    let notes = dto.notes ?? item.notes;
    if (dto.requestOnSiteVisit) {
      const visitNote = 'On-site visit requested';
      if (!notes) {
        notes = visitNote;
      } else if (!notes.includes(visitNote)) {
        notes = `${notes}\n${visitNote}`;
      }
    }

    // Auto-transition to SUBMITTED logic
    let newStatus = item.status;
    const hasEvidence = (dto.evidenceUrls && dto.evidenceUrls.length > 0);
    const hasLocation = (dto.gpsLat !== undefined && dto.gpsLng !== undefined) || dto.requestOnSiteVisit;

    if (item.status === 'PENDING' || item.status === 'REJECTED') {
      if (hasEvidence || hasLocation) {
        newStatus = 'SUBMITTED';
      }
    } else if (item.status === 'SUBMITTED') {
      // Keep as SUBMITTED (editing window)
      newStatus = 'SUBMITTED';
    }

    // If updating usage of REJECTED item was successful, ensure parent request is also revived if it was rejected
    if (item.status === 'REJECTED' && newStatus === 'SUBMITTED') {
      const parentRequest = await this.prisma.verificationRequest.findUnique({ where: { id: item.verificationRequest.id } });
      if (parentRequest && parentRequest.status === 'REJECTED') {
        await this.prisma.verificationRequest.update({
          where: { id: parentRequest.id },
          data: { status: 'PENDING' }
        });
      }
    }

    const updatedItem = await this.prisma.verificationRequestItem.update({
      where: { id: itemId },
      data: {
        evidenceUrls: dto.evidenceUrls ?? item.evidenceUrls,
        gpsLat: dto.gpsLat ?? item.gpsLat,
        gpsLng: dto.gpsLng ?? item.gpsLng,
        notes: notes,
        status: newStatus,
        verifierId: newStatus === 'SUBMITTED' ? null : item.verifierId, // Reset verifier on resubmit
        reviewedAt: newStatus === 'SUBMITTED' ? null : item.reviewedAt
      }
    });

    await this.audit.log({
      action: 'verification.item.update',
      actorId: actor.userId,
      targetType: 'verificationRequestItem',
      targetId: itemId,
      metadata: { propertyId, itemType: item.type, newStatus }
    });

    return updatedItem;
  }

  async reviewVerificationItem(
    propertyId: string,
    itemId: string,
    dto: { status: string; notes?: string },
    actor: AuthContext
  ) {
    // Only admins can review verification items
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only administrators can review verification items');
    }

    const property = await this.getPropertyOrThrow(propertyId);
    const item = await this.prisma.verificationRequestItem.findUnique({
      where: { id: itemId },
      include: {
        verificationRequest: {
          select: { propertyId: true, id: true }
        }
      }
    });

    if (!item) {
      throw new NotFoundException('Verification item not found');
    }

    if (item.verificationRequest.propertyId !== propertyId) {
      throw new BadRequestException('Verification item does not belong to this property');
    }

    const updated = await this.prisma.verificationRequestItem.update({
      where: { id: itemId },
      data: {
        status: dto.status as VerificationItemStatus,
        notes: dto.notes ?? item.notes,
        verifierId: actor.userId,
        reviewedAt: new Date()
      }
    });

    // Check if all items are reviewed and update request status
    const allItems = await this.prisma.verificationRequestItem.findMany({
      where: { verificationRequestId: item.verificationRequest.id }
    });

    const allApproved = allItems.every((i: { status: string }) => i.status === 'APPROVED');
    const anyRejected = allItems.some((i: { status: string }) => i.status === 'REJECTED');

    if (allApproved) {
      await this.prisma.verificationRequest.update({
        where: { id: item.verificationRequest.id },
        data: { status: VerificationStatus.APPROVED }
      });

      // Update property status to VERIFIED
      await this.prisma.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.VERIFIED,
          verifiedAt: new Date()
        }
      });
    } else if (anyRejected) {
      await this.prisma.verificationRequest.update({
        where: { id: item.verificationRequest.id },
        data: { status: VerificationStatus.REJECTED }
      });
    }

    await this.audit.log({
      action: 'verification.item.review',
      actorId: actor.userId,
      targetType: 'verificationRequestItem',
      targetId: itemId,
      metadata: { propertyId, status: dto.status }
    });

    // Log activity
    const activityType = dto.status === 'APPROVED'
      ? ListingActivityType.VERIFICATION_APPROVED
      : ListingActivityType.VERIFICATION_REJECTED;
    await this.logActivity(propertyId, activityType, actor.userId, {
      verificationRequestId: item.verificationRequest.id,
      itemType: item.type
    });

    return updated;
  }

  async mapBounds(dto: MapBoundsDto) {
    const southLat = Math.min(dto.southWestLat, dto.northEastLat);
    const northLat = Math.max(dto.southWestLat, dto.northEastLat);
    const westLng = Math.min(dto.southWestLng, dto.northEastLng);
    const eastLng = Math.max(dto.southWestLng, dto.northEastLng);

    const properties = await this.prisma.property.findMany({
      where: {
        status: PropertyStatus.VERIFIED,
        lat: {
          gte: southLat,
          lte: northLat
        },
        lng: {
          gte: westLng,
          lte: eastLng
        },
        ...(dto.type ? { type: dto.type } : {})
      },
      include: {
        media: { take: 3 },
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true
      }
    });

    return this.attachLocationToMany(properties);
  }



  async createSignedUpload(dto: CreateSignedUploadDto, actor: AuthContext) {
    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException('Unsupported file type');
    }

    const extension = extname(dto.fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Unsupported file extension');
    }

    if (dto.propertyId) {
      const property = await this.getPropertyOrThrow(dto.propertyId);
      this.ensureCanMutate(property, actor);
    }

    const key = `properties/${dto.propertyId ?? 'drafts'}/${randomUUID()}${extension}`;
    const expires = Math.floor(Date.now() / 1000) + 900;
    const payload = `${key}:${dto.mimeType}:${expires}`;
    const signature = createHmac('sha256', env.S3_SECRET_KEY)
      .update(payload)
      .digest('hex');

    return {
      key,
      uploadUrl: `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}?expires=${expires}&signature=${signature}`,
      method: 'PUT',
      headers: {
        'Content-Type': dto.mimeType,
        'x-upload-signature': signature,
        'x-upload-expires': expires.toString()
      },
      expiresAt: new Date(expires * 1000)
    };
  }

  /**
   * Local image upload - stores files on disk and saves reference in database.
   * This is a fallback for when S3/R2 is not available.
   */
  async uploadLocalMedia(
    propertyId: string,
    file: { filename: string; mimetype: string; buffer: Buffer },
    actor: AuthContext
  ) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureCanMutate(property, actor);

    // Create uploads directory if it doesn't exist
    // Use resolve to get absolute path from project root
    const uploadsDir = resolve('uploads', 'properties', propertyId);
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const extension = extname(file.filename).toLowerCase();
    const uniqueName = `${randomUUID()}${extension}`;
    const filePath = join(uploadsDir, uniqueName);

    // Write file to disk
    await writeFile(filePath, file.buffer as unknown as Uint8Array);

    // Determine media kind
    const kind = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';

    // Save reference in database
    const media = await this.prisma.propertyMedia.create({
      data: {
        propertyId,
        url: `/uploads/properties/${propertyId}/${uniqueName}`,
        kind,
        hasGps: false,
      }
    });

    await this.audit.log({
      action: 'property.uploadMedia',
      actorId: actor.userId,
      targetType: 'property',
      targetId: propertyId,
      metadata: { mediaId: media.id, filename: file.filename }
    });

    return media;
  }

  async listMedia(propertyId: string) {
    return this.prisma.propertyMedia.findMany({
      where: { propertyId },
      orderBy: { id: 'asc' }
    });
  }

  /**
   * Auto-confirm accepted offers older than 30 days
   * Called by scheduled task
   */
  async autoConfirmOldOffers(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldAcceptedOffers = await this.prisma.interest.findMany({
      where: {
        status: InterestStatus.ACCEPTED,
        updatedAt: { lte: thirtyDaysAgo }
      },
      include: {
        property: {
          select: {
            id: true,
            dealConfirmedAt: true
          }
        }
      }
    });

    for (const offer of oldAcceptedOffers) {
      // Skip if property is already confirmed
      if (offer.property.dealConfirmedAt) {
        continue;
      }

      try {
        await this.prisma.$transaction(async (tx) => {
          // Confirm the accepted offer
          await tx.interest.update({
            where: { id: offer.id },
            data: { status: InterestStatus.CONFIRMED }
          });

          // Reject all other offers on this property
          await tx.interest.updateMany({
            where: {
              propertyId: offer.propertyId,
              id: { not: offer.id },
              status: { not: InterestStatus.CONFIRMED }
            },
            data: { status: InterestStatus.REJECTED }
          });

          // Mark property as confirmed
          await tx.property.update({
            where: { id: offer.propertyId },
            data: {
              dealConfirmedAt: new Date(),
              dealConfirmedById: null // System auto-confirmation
            }
          });
        });

        this.logger.log(`Auto-confirmed offer ${offer.id} for property ${offer.propertyId}`);
      } catch (error) {
        this.logger.error(`Failed to auto-confirm offer ${offer.id}:`, error);
      }
    }
  }

  async deleteMedia(propertyId: string, mediaId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureCanMutate(property, actor);

    const media = await this.prisma.propertyMedia.findFirst({
      where: { id: mediaId, propertyId }
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Try to delete local file if it's a local upload
    if (media.url.startsWith('/uploads/')) {
      try {
        // Construct path by removing leading slash from URL
        const filePath = resolve(media.url.substring(1));
        await unlink(filePath);
      } catch (error) {
        // File may not exist, continue with database deletion
      }
    }

    await this.prisma.propertyMedia.delete({ where: { id: mediaId } });

    await this.audit.log({
      action: 'property.deleteMedia',
      actorId: actor.userId,
      targetType: 'property',
      targetId: propertyId,
      metadata: { mediaId }
    });

    return { success: true };
  }

  async scheduleViewing(propertyId: string, dto: { scheduledAt: string; notes?: string; locationLat?: number; locationLng?: number }, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify user has an accepted or confirmed offer
    const interest = await this.prisma.interest.findFirst({
      where: {
        propertyId,
        userId: actor.userId,
        status: { in: [InterestStatus.ACCEPTED, InterestStatus.CONFIRMED] }
      }
    });

    if (!interest) {
      throw new ForbiddenException('You must have an accepted or confirmed offer to schedule a viewing');
    }

    const viewing = await this.prisma.viewing.create({
      data: {
        propertyId,
        viewerId: actor.userId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes ?? null,
        locationLat: dto.locationLat ?? null,
        locationLng: dto.locationLng ?? null,
        status: 'PENDING',
        landlordId: property.landlordId,
        agentId: property.agentOwnerId
      },
      include: {
        viewer: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
        landlord: { select: { id: true, name: true } }
      }
    });

    // TODO: Trigger email notification
    // TODO: Trigger WhatsApp/SMS notification

    await this.audit.log({
      action: 'viewing.schedule',
      actorId: actor.userId,
      targetType: 'viewing',
      targetId: viewing.id,
      metadata: { propertyId, scheduledAt: dto.scheduledAt }
    });

    // Log activity
    await this.logActivity(propertyId, ListingActivityType.VIEWING_SCHEDULED, actor.userId, {
      viewingId: viewing.id,
      scheduledAt: dto.scheduledAt
    });

    return viewing;
  }

  async respondToViewing(viewingId: string, dto: { status: string; notes?: string }, actor: AuthContext) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id: viewingId },
      include: {
        property: {
          select: {
            id: true,
            landlordId: true,
            agentOwnerId: true
          }
        }
      }
    });

    if (!viewing) {
      throw new NotFoundException('Viewing not found');
    }

    // Verify actor is landlord or agent
    const isAuthorized = viewing.property.landlordId === actor.userId || viewing.property.agentOwnerId === actor.userId;
    if (!isAuthorized) {
      throw new ForbiddenException('Only the property owner or assigned agent can respond to viewings');
    }

    const updated = await this.prisma.viewing.update({
      where: { id: viewingId },
      data: {
        status: dto.status as any,
        notes: dto.notes ?? viewing.notes
      },
      include: {
        viewer: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
        landlord: { select: { id: true, name: true } }
      }
    });

    // TODO: Trigger email notification
    // TODO: Trigger WhatsApp/SMS notification

    await this.audit.log({
      action: 'viewing.respond',
      actorId: actor.userId,
      targetType: 'viewing',
      targetId: viewingId,
      metadata: { status: dto.status }
    });

    // Log activity
    let activityType: ListingActivityType;
    if (dto.status === 'ACCEPTED') {
      activityType = ListingActivityType.VIEWING_ACCEPTED;
    } else if (dto.status === 'POSTPONED') {
      activityType = ListingActivityType.VIEWING_POSTPONED;
    } else if (dto.status === 'CANCELLED') {
      activityType = ListingActivityType.VIEWING_CANCELLED;
    } else {
      return updated; // Unknown status, skip logging
    }
    await this.logActivity(viewing.property.id, activityType, actor.userId, {
      viewingId,
      status: dto.status
    });

    return updated;
  }

  async listPayments(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify actor is landlord or agent
    const isAuthorized = property.landlordId === actor.userId || property.agentOwnerId === actor.userId;
    if (!isAuthorized && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the property owner or assigned agent can view payments');
    }

    const payments = await this.prisma.listingPayment.findMany({
      where: { propertyId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            paymentIntents: {
              select: {
                id: true,
                redirectUrl: true,
                status: true,
                gateway: true
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return payments;
  }

  /**
   * Calculate weight for a property rating based on:
   * - Verified tenant > unverified
   * - Long-term tenant > short-term
   * - Current tenants (anonymous) have lower weight
   */
  private calculateRatingWeight(
    type: PropertyRatingType,
    isVerifiedTenant: boolean,
    tenantMonths?: number | null,
    isAnonymous: boolean = false
  ): number {
    let baseWeight = 1;

    // Base weight by type
    switch (type) {
      case PropertyRatingType.PREVIOUS_TENANT:
        baseWeight = 10;
        break;
      case PropertyRatingType.CURRENT_TENANT:
        baseWeight = isAnonymous ? 3 : 5; // Anonymous current tenants have lower weight
        break;
      case PropertyRatingType.VISITOR:
        baseWeight = 2;
        break;
      case PropertyRatingType.ANONYMOUS:
        baseWeight = 1;
        break;
    }

    // Verified tenant bonus
    if (isVerifiedTenant) {
      baseWeight *= 1.5;
    }

    // Long-term tenant bonus (6+ months)
    if (tenantMonths && tenantMonths >= 6) {
      baseWeight *= 1.3;
    }
    // Very long-term tenant bonus (12+ months)
    if (tenantMonths && tenantMonths >= 12) {
      baseWeight *= 1.2;
    }

    return Math.round(baseWeight);
  }

  async submitPropertyRating(propertyId: string, dto: {
    rating: number;
    comment?: string;
    type: string;
    isAnonymous?: boolean;
    tenantMonths?: number;
  }, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Role restriction: Landlords/Agents cannot rate their own property
    if (property.landlordId === actor.userId || property.agentOwnerId === actor.userId) {
      throw new ForbiddenException('You cannot rate your own property');
    }

    // Check if user already rated this property (unless anonymous)
    if (!dto.isAnonymous) {
      const existingRating = await this.prisma.propertyRating.findUnique({
        where: {
          propertyId_reviewerId: {
            propertyId,
            reviewerId: actor.userId
          }
        }
      });

      if (existingRating) {
        throw new BadRequestException('You have already rated this property');
      }
    }

    // Determine if user is a verified tenant
    // Check rent payments to determine tenant status
    const rentPayments = await this.prisma.rentPayment.findMany({
      where: {
        propertyId,
        tenantId: actor.userId,
        isVerified: true
      },
      orderBy: { paidAt: 'asc' }
    });

    const isVerifiedTenant = rentPayments.length > 0;
    const firstPayment = rentPayments[0];
    const lastPayment = rentPayments[rentPayments.length - 1];

    // Calculate tenant months if not provided
    let tenantMonths = dto.tenantMonths;
    if (!tenantMonths && firstPayment && lastPayment) {
      const monthsDiff = (lastPayment.paidAt.getTime() - firstPayment.paidAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      tenantMonths = Math.round(monthsDiff);
    }

    // Calculate weight
    const weight = this.calculateRatingWeight(
      dto.type as PropertyRatingType,
      isVerifiedTenant,
      tenantMonths,
      dto.isAnonymous
    );

    const rating = await this.prisma.propertyRating.create({
      data: {
        propertyId,
        reviewerId: dto.isAnonymous ? null : actor.userId,
        rating: dto.rating,
        weight,
        comment: dto.comment ?? null,
        type: dto.type as PropertyRatingType,
        isAnonymous: dto.isAnonymous ?? false,
        tenantMonths: tenantMonths ?? null,
        isVerifiedTenant
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            isVerified: true
          }
        }
      }
    });

    await this.audit.log({
      action: 'property.rating.submit',
      actorId: actor.userId,
      targetType: 'property',
      targetId: propertyId,
      metadata: {
        ratingId: rating.id,
        rating: dto.rating,
        weight,
        type: dto.type,
        isAnonymous: dto.isAnonymous
      }
    });

    // Log activity
    await this.logActivity(propertyId, ListingActivityType.RATING_SUBMITTED, dto.isAnonymous ? null : actor.userId, {
      ratingId: rating.id,
      rating: dto.rating,
      type: dto.type
    });

    return rating;
  }

  async getPropertyRatings(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    const ratings = await this.prisma.propertyRating.findMany({
      where: { propertyId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate aggregated weighted score
    const totalWeight = ratings.reduce((sum: number, r: { weight: number }) => sum + r.weight, 0);
    const weightedSum = ratings.reduce((sum: number, r: { rating: number; weight: number }) => sum + (r.rating * r.weight), 0);
    const averageRating = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const roundedAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    // Count by rating value
    const ratingCounts = ratings.reduce((acc: Record<number, number>, r: { rating: number }) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return {
      ratings,
      aggregate: {
        average: roundedAverage,
        totalCount: ratings.length,
        weightedAverage: roundedAverage,
        totalWeight,
        ratingCounts: {
          5: ratingCounts[5] || 0,
          4: ratingCounts[4] || 0,
          3: ratingCounts[3] || 0,
          2: ratingCounts[2] || 0,
          1: ratingCounts[1] || 0
        }
      },
      userRating: ratings.find((r: { reviewerId: string | null; isAnonymous: boolean }) => r.reviewerId === actor.userId && !r.isAnonymous) || null
    };
  }

  /**
   * Log a listing activity (non-blocking)
   */
  private async logActivity(
    propertyId: string,
    type: ListingActivityType,
    actorId: string | null,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.prisma.listingActivityLog.create({
        data: {
          propertyId,
          type,
          actorId,
          metadata: metadata ? (metadata as Prisma.JsonObject) : undefined
        }
      });
    } catch (error) {
      // Non-blocking: log errors but don't fail the main operation
      this.logger.warn(`Failed to log activity ${type} for property ${propertyId}`, error);
    }
  }

  async getActivityLogs(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Fetch all activity logs
    const logs = await this.prisma.listingActivityLog.findMany({
      where: { propertyId },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to most recent 100 activities
    });

    // Aggregate statistics
    const stats = {
      offers: {
        received: 0,
        accepted: 0,
        rejected: 0,
        confirmed: 0,
        onHold: 0
      },
      payments: {
        created: 0,
        paid: 0,
        failed: 0,
        totalAmount: 0
      },
      verification: {
        submitted: 0,
        approved: 0,
        rejected: 0
      },
      viewings: {
        scheduled: 0,
        accepted: 0,
        postponed: 0,
        cancelled: 0
      },
      chatMessages: 0,
      ratings: 0,
      views: 0
    };

    // Count activities by type
    logs.forEach((log: { type: ListingActivityType; metadata: unknown }) => {
      switch (log.type) {
        case ListingActivityType.OFFER_RECEIVED:
          stats.offers.received++;
          break;
        case ListingActivityType.OFFER_ACCEPTED:
          stats.offers.accepted++;
          break;
        case ListingActivityType.OFFER_REJECTED:
          stats.offers.rejected++;
          break;
        case ListingActivityType.OFFER_CONFIRMED:
          stats.offers.confirmed++;
          break;
        case ListingActivityType.OFFER_ON_HOLD:
          stats.offers.onHold++;
          break;
        case ListingActivityType.PAYMENT_CREATED:
          stats.payments.created++;
          break;
        case ListingActivityType.PAYMENT_PAID:
          stats.payments.paid++;
          if (log.metadata && typeof log.metadata === 'object' && 'amount' in log.metadata) {
            stats.payments.totalAmount += Number(log.metadata.amount) || 0;
          }
          break;
        case ListingActivityType.PAYMENT_FAILED:
          stats.payments.failed++;
          break;
        case ListingActivityType.VERIFICATION_SUBMITTED:
          stats.verification.submitted++;
          break;
        case ListingActivityType.VERIFICATION_APPROVED:
          stats.verification.approved++;
          break;
        case ListingActivityType.VERIFICATION_REJECTED:
          stats.verification.rejected++;
          break;
        case ListingActivityType.VIEWING_SCHEDULED:
          stats.viewings.scheduled++;
          break;
        case ListingActivityType.VIEWING_ACCEPTED:
          stats.viewings.accepted++;
          break;
        case ListingActivityType.VIEWING_POSTPONED:
          stats.viewings.postponed++;
          break;
        case ListingActivityType.VIEWING_CANCELLED:
          stats.viewings.cancelled++;
          break;
        case ListingActivityType.CHAT_MESSAGE:
          stats.chatMessages++;
          break;
        case ListingActivityType.RATING_SUBMITTED:
          stats.ratings++;
          break;
        case ListingActivityType.PROPERTY_VIEWED:
          stats.views++;
          break;
      }
    });

    return {
      logs,
      statistics: stats
    };
  }

  async listViewings(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify actor is landlord or agent
    const isAuthorized = property.landlordId === actor.userId || property.agentOwnerId === actor.userId;
    if (!isAuthorized && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the property owner or assigned agent can view viewing requests');
    }

    return this.prisma.viewing.findMany({
      where: { propertyId },
      include: {
        viewer: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
        landlord: { select: { id: true, name: true } }
      },
      orderBy: { scheduledAt: 'asc' }
    });
  }
}

function messagesRecipient(
  property: { landlordId: string | null; agentOwnerId: string | null },
  senderId: string
) {
  if (senderId === property.landlordId) {
    return property.agentOwnerId ?? property.landlordId; // Self message if no agent?
  }
  return property.landlordId;
}

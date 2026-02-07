import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  Currency,
  ListingIntent,
  Prisma,
  PropertyAvailability,
  PropertyFurnishing,
  PropertyStatus,
  VerificationLevel,
  PropertyType,
  RewardEventType,
  ListingActivityType,
} from "@prisma/client";
import { Role, PowerPhase, AgencyMemberRole } from "@propad/config";

// Local Enum Definitions
const InterestStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  WITHDRAWN: "WITHDRAWN",
  EXPIRED: "EXPIRED",
  CONFIRMED: "CONFIRMED",
} as const;
type InterestStatus = (typeof InterestStatus)[keyof typeof InterestStatus];

const ListingCreatorRole = {
  AGENT: "AGENT",
  LANDLORD: "LANDLORD",
  ADMIN: "ADMIN",
} as const;
type ListingCreatorRole =
  (typeof ListingCreatorRole)[keyof typeof ListingCreatorRole];

const ListingPaymentType = {
  LISTING_FEE: "LISTING_FEE",
  PROMOTION: "PROMOTION",
  VERIFICATION: "VERIFICATION",
  AGENT_FEE: "AGENT_FEE",
  ASSIGNMENT_FEE: "ASSIGNMENT_FEE",
} as const;
type ListingPaymentType =
  (typeof ListingPaymentType)[keyof typeof ListingPaymentType];

const ViewingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
} as const;
type ViewingStatus = (typeof ViewingStatus)[keyof typeof ViewingStatus];

const VerificationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

const VerificationItemStatus = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
type VerificationItemStatus =
  (typeof VerificationItemStatus)[keyof typeof VerificationItemStatus];

const PropertyRatingType = {
  LOCATION: "LOCATION",
  VALUE: "VALUE",
  CONDITION: "CONDITION",
  SAFETY: "SAFETY",
  PREVIOUS_TENANT: "PREVIOUS_TENANT",
  CURRENT_TENANT: "CURRENT_TENANT",
  VISITOR: "VISITOR",
  ANONYMOUS: "ANONYMOUS",
} as const;
type PropertyRatingType =
  (typeof PropertyRatingType)[keyof typeof PropertyRatingType];

const LocalListingActivityType = {
  CREATED: "CREATED",
  UPDATED: "UPDATED",
  VIEWED: "VIEWED",
  SAVED: "SAVED",
  INQUIRED: "INQUIRED",
  CONTACTED: "CONTACTED",
  SHARED: "SHARED",
  REPORTED: "REPORTED",
  AGENT_ASSIGNED: "AGENT_ASSIGNED",
  OFFER_RECEIVED: "OFFER_RECEIVED",
  OFFER_ACCEPTED: "OFFER_ACCEPTED",
  OFFER_REJECTED: "OFFER_REJECTED",
  OFFER_CONFIRMED: "OFFER_CONFIRMED",
  OFFER_ON_HOLD: "OFFER_ON_HOLD",
  PAYMENT_CREATED: "PAYMENT_CREATED",
  PAYMENT_PAID: "PAYMENT_PAID",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  VERIFICATION_SUBMITTED: "VERIFICATION_SUBMITTED",
  VERIFICATION_APPROVED: "VERIFICATION_APPROVED",
  VERIFICATION_REJECTED: "VERIFICATION_REJECTED",
  VIEWING_SCHEDULED: "VIEWING_SCHEDULED",
  VIEWING_ACCEPTED: "VIEWING_ACCEPTED",
  VIEWING_POSTPONED: "VIEWING_POSTPONED",
  VIEWING_CANCELLED: "VIEWING_CANCELLED",
  CHAT_MESSAGE: "CHAT_MESSAGE",
  RATING_SUBMITTED: "RATING_SUBMITTED",
  PROPERTY_VIEWED: "PROPERTY_VIEWED",
} as const;

const ListingPaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
type ListingPaymentStatus = string;
import { createHmac, randomUUID } from "crypto";
import { extname, join, resolve } from "path";
import { existsSync } from "fs";
import { mkdir, writeFile, unlink, appendFile } from "fs/promises";
import { env } from "@propad/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { GeoService } from "../geo/geo.service";
import { CreatePropertyDto } from "./dto/create-property.dto";
import { PaymentsService } from "../payments/payments.service";
import { PricingService } from "../pricing/pricing.service";
import { differenceInHours } from "date-fns";
import { VerificationsService } from "../verifications/verifications.service";
import { UpdatePropertyDto } from "./dto/update-property.dto";
import { SubmitForVerificationDto } from "./dto/submit-verification.dto";
import { MapBoundsDto } from "./dto/map-bounds.dto";
import { CreateSignedUploadDto } from "./dto/signed-upload.dto";
import { SearchPropertiesDto } from "./dto/search-properties.dto";
import { AssignAgentDto } from "./dto/assign-agent.dto";
import { UpdateDealConfirmationDto } from "./dto/update-deal-confirmation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { UpdateServiceFeeDto } from "./dto/update-service-fee.dto";
import { CreateManagementAssignmentDto } from "./dto/create-management-assignment.dto";
import { SetOperatingAgentDto } from "./dto/set-operating-agent.dto";
// differenceInHours already imported above
import { VerificationFingerprintService } from "../verifications/verification-fingerprint.service";
import { RankingService } from "../ranking/ranking.service";
import { RiskService, RiskSignalType } from "../trust/risk.service";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp4",
  ".pdf",
  ".doc",
  ".docx",
]);

type AuthContext = {
  userId: string;
  role: Role;
};

const SALE_CONFIRMED_POINTS = 150;
const SALE_CONFIRMED_USD_CENTS = 0;

const COMMERCIAL_TYPES: ReadonlySet<PropertyType> = new Set([
  "COMMERCIAL_OFFICE" as PropertyType,
  "COMMERCIAL_RETAIL" as PropertyType,
  "COMMERCIAL_INDUSTRIAL" as PropertyType,
  "WAREHOUSE" as PropertyType,
  "FARM" as PropertyType,
  "MIXED_USE" as PropertyType,
  "OTHER" as PropertyType,
]);

const RESIDENTIAL_TYPES: ReadonlySet<PropertyType> = new Set([
  "ROOM" as PropertyType,
  "COTTAGE" as PropertyType,
  "HOUSE" as PropertyType,
  "APARTMENT" as PropertyType,
  "TOWNHOUSE" as PropertyType,
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

  private resolveUploadsRoot() {
    const runtimeCwd = process.env.INIT_CWD ?? process.env.PWD ?? ".";
    const candidates = [
      process.env.UPLOADS_DIR,
      resolve(runtimeCwd, "uploads"),
      resolve(runtimeCwd, "apps", "api", "uploads"),
      resolve(runtimeCwd, "..", "uploads"),
      resolve(runtimeCwd, "..", "..", "uploads"),
    ].filter((value): value is string => !!value);

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    return resolve(runtimeCwd, "uploads");
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly geo: GeoService,
    private readonly fingerprintService: VerificationFingerprintService,
    private readonly ranking: RankingService,
    private readonly riskService: RiskService,
    private readonly pricing: PricingService,
    private readonly paymentsService: PaymentsService,
    private readonly verificationsService: VerificationsService,
  ) { }

  /**
   * Recursively convert Prisma Decimal types and Date objects for JSON serialization
   * Uses a Set to track visited objects and prevent circular reference issues
   */
  private convertDecimalsToNumbers(
    obj: any,
    visited: Set<any> = new Set(),
  ): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Prevent circular references
    if (typeof obj === "object") {
      if (visited.has(obj)) {
        return "[Circular]";
      }
      visited.add(obj);
    }

    try {
      // Check if it's a Prisma Decimal
      if (
        obj &&
        typeof obj === "object" &&
        "toNumber" in obj &&
        typeof obj.toNumber === "function"
      ) {
        return obj.toNumber();
      }

      // Check if it's a Date object - convert to ISO string
      if (obj instanceof Date) {
        return obj.toISOString();
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map((item) => this.convertDecimalsToNumbers(item, visited));
      }

      // Handle objects (but skip functions and special objects)
      if (typeof obj === "object") {
        // Skip Buffer and other special objects
        if (obj instanceof Buffer || obj.constructor?.name === "Buffer") {
          return obj;
        }

        const converted: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            try {
              converted[key] = this.convertDecimalsToNumbers(obj[key], visited);
            } catch (error) {
              // Skip properties that can't be converted
              this.logger.warn(
                `Failed to convert property ${key}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        }
        return converted;
      }

      return obj;
    } finally {
      // Clean up visited set for this branch
      if (typeof obj === "object") {
        visited.delete(obj);
      }
    }
  }

  /**
   * Log debug information to file
   */
  private async logDebug(
    location: string,
    message: string,
    data: any,
    hypothesisId?: string,
  ): Promise<void> {
    try {
      const logEntry =
        JSON.stringify({
          location,
          message,
          data,
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId,
        }) + "\n";
      await mkdir(".cursor", { recursive: true }).catch(() => { });
      await appendFile(".cursor/debug.log", logEntry).catch(() => { });
    } catch {
      // Ignore logging errors
    }
  }

  private pickString(
    ...values: Array<string | null | undefined>
  ): string | undefined {
    for (const value of values) {
      if (typeof value === "string") {
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
    this.logDebug(
      "properties.service.ts:207",
      "attachLocation entry",
      {
        propertyId: property?.id,
        hasCountry: !!property?.country,
        hasProvince: !!property?.province,
        hasPrice: !!property?.price,
        priceType: typeof property?.price,
      },
      "A",
    ).catch(() => { });
    // #endregion
    try {
      // Safely extract location data with proper null checks
      const country =
        property.country && typeof property.country === "object"
          ? property.country
          : null;
      const province =
        property.province && typeof property.province === "object"
          ? property.province
          : null;
      const city =
        property.city && typeof property.city === "object"
          ? property.city
          : null;
      const suburb =
        property.suburb && typeof property.suburb === "object"
          ? property.suburb
          : null;
      const pendingGeo =
        property.pendingGeo && typeof property.pendingGeo === "object"
          ? property.pendingGeo
          : null;

      // #region agent log
      this.logDebug(
        "properties.service.ts:219",
        "attachLocation before spread",
        {
          propertyId: property?.id,
          countryType: typeof country,
          provinceType: typeof province,
        },
        "A",
      ).catch(() => { });
      // #endregion

      // Exclude Prisma relation objects from the spread to avoid serialization issues
      const {
        country: _country,
        province: _province,
        city: _city,
        suburb: _suburb,
        pendingGeo: _pendingGeo,
        ...cleanProperty
      } = property as any;

      // #region agent log
      this.logDebug(
        "properties.service.ts:226",
        "attachLocation after spread",
        {
          propertyId: property?.id,
          cleanPropertyKeys: Object.keys(cleanProperty).slice(0, 10),
          hasPrice: !!cleanProperty?.price,
          priceType: typeof cleanProperty?.price,
          priceValue: cleanProperty?.price?.toString?.()?.substring(0, 20),
        },
        "B",
      ).catch(() => { });
      // #endregion

      // Use pending geo's proposed name as suburb name if no regular suburb exists
      const suburbName =
        suburb?.name ??
        (pendingGeo?.proposedName
          ? `${pendingGeo.proposedName} (pending)`
          : null);

      // Build display location using resolved hierarchy: Suburb → City → Province → Country
      // Build display location using resolved hierarchy: Suburb → City → Province → Country
      const locationParts: string[] = [];
      if (suburbName) locationParts.push(suburbName);
      if (city?.name) locationParts.push(city.name);
      if (province?.name) locationParts.push(province.name);
      if (country?.name) locationParts.push(country.name);
      const displayLocation =
        locationParts.length > 0 ? locationParts.join(", ") : null;

      // Verification Signals
      // Prioritize DB fields if present (from search/find queries)
      // Fallback to 0 if not selected (partial objects)
      const verificationScore =
        typeof (property as any).verificationScore === "number"
          ? (property as any).verificationScore
          : 0;
      const verificationLevel = (property as any).verificationLevel || "NONE";

      // Map Level to Badge Text (Frontend Compat)
      let verificationBadge = "Not Verified";
      if (verificationLevel === "VERIFIED")
        verificationBadge = "Fully Verified"; // Gold
      else if (verificationLevel === "TRUSTED")
        verificationBadge = "Verified"; // Silver
      else if (verificationLevel === "BASIC")
        verificationBadge = "Basic Verification"; // Bronze

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
              id: String(country.id ?? ""),
              name: String(country.name ?? ""),
              iso2: String(country.iso2 ?? ""),
              phoneCode: String(country.phoneCode ?? ""),
            }
            : null,
          provinceId: property.provinceId ?? null,
          province: province
            ? {
              id: String(province.id ?? ""),
              name: String(province.name ?? ""),
            }
            : null,
          cityId: property.cityId ?? null,
          city: city
            ? { id: String(city.id ?? ""), name: String(city.name ?? "") }
            : null,
          suburbId: property.suburbId ?? null,
          suburb: suburb
            ? { id: String(suburb.id ?? ""), name: String(suburb.name ?? "") }
            : null,
          pendingGeoId: property.pendingGeoId ?? null,
          pendingGeo: pendingGeo
            ? {
              id: String(pendingGeo.id ?? ""),
              proposedName: String(pendingGeo.proposedName ?? ""),
              level: String(pendingGeo.level ?? ""),
              status: String(pendingGeo.status ?? ""),
            }
            : null,
          lat: typeof property.lat === "number" ? property.lat : null,
          lng: typeof property.lng === "number" ? property.lng : null,
        },
      };

      // Convert all Prisma Decimal types recursively for JSON serialization
      const convertedResult = this.convertDecimalsToNumbers(result);

      // #region agent log
      this.logDebug(
        "properties.service.ts:267",
        "attachLocation success",
        {
          propertyId: property?.id,
          resultPriceType: typeof convertedResult?.price,
          resultAreaSqmType: typeof convertedResult?.areaSqm,
        },
        "B",
      ).catch(() => { });
      // #endregion

      return convertedResult;
    } catch (error) {
      // Log error and return property with minimal location data
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error in attachLocation${property?.id ? ` for property ${property.id}` : ""}: ${errorMessage}`,
        errorStack,
      );

      // Return a safe, serializable object with only essential fields
      // Create a clean serializable object, excluding Prisma relation objects
      const { country, province, city, suburb, pendingGeo, ...cleanProperty } =
        property as any;
      const errorResult: any = {
        ...cleanProperty,
        countryName: null,
        provinceName: null,
        cityName: null,
        suburbName: null,
        displayLocation: null,
        verificationWeight: 0,
        verificationBadge: "Not Verified",
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
          lng: null,
        },
      };

      // Convert all Prisma Decimal types recursively for JSON serialization
      return this.convertDecimalsToNumbers(errorResult);
    }
  }

  private attachLocationToMany<T extends Record<string, unknown>>(
    properties: T[],
  ) {
    // #region agent log
    this.logDebug(
      "properties.service.ts:310",
      "attachLocationToMany entry",
      { propertyCount: properties.length },
      "C",
    ).catch(() => { });
    // #endregion
    return properties
      .map((property, index) => {
        try {
          // #region agent log
          this.logDebug(
            "properties.service.ts:316",
            "attachLocationToMany processing property",
            { index, propertyId: property?.id },
            "C",
          ).catch(() => { });
          // #endregion
          return this.attachLocation(property);
        } catch (error) {
          // Log error but return property without location data to prevent 500 errors
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          this.logger.error(
            `Error attaching location to property${property?.id ? ` ${property.id}` : ""}: ${errorMessage}`,
            errorStack,
          );
          // Create a clean serializable object, excluding Prisma relation objects
          const {
            country,
            province,
            city,
            suburb,
            pendingGeo,
            ...cleanProperty
          } = property as any;
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
              lng: null,
            },
          };

          // Convert all Prisma Decimal types recursively for JSON serialization
          return this.convertDecimalsToNumbers(errorResult);
        }
      })
      .map((result, index) => {
        // #region agent log
        this.logDebug(
          "properties.service.ts:355",
          "attachLocationToMany result",
          {
            index,
            resultId: result?.id,
            hasPrice: !!result?.price,
            priceType: typeof result?.price,
            isDecimal: result?.price?.constructor?.name === "Decimal",
          },
          "B",
        ).catch(() => { });
        // #endregion
        // Convert all Decimal types recursively
        const converted = this.convertDecimalsToNumbers(result);
        // #region agent log
        this.logDebug(
          "properties.service.ts:360",
          "attachLocationToMany converted Decimal",
          {
            index,
            resultId: converted?.id,
            newPriceType: typeof converted?.price,
          },
          "B",
        ).catch(() => { });
        // #endregion
        return converted;
      });
  }

  private normalizeCommercialFields(
    input: CreatePropertyDto["commercialFields"],
  ) {
    if (!input) {
      return Prisma.JsonNull;
    }

    const normalized: Record<string, unknown> = {};

    if (
      typeof input.floorAreaSqm === "number" &&
      Number.isFinite(input.floorAreaSqm)
    ) {
      normalized.floorAreaSqm = input.floorAreaSqm;
    }
    if (
      typeof input.lotSizeSqm === "number" &&
      Number.isFinite(input.lotSizeSqm)
    ) {
      normalized.lotSizeSqm = input.lotSizeSqm;
    }
    if (
      typeof input.parkingBays === "number" &&
      Number.isFinite(input.parkingBays)
    ) {
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
    if (typeof input.zoning === "string" && input.zoning.trim()) {
      normalized.zoning = input.zoning.trim();
    }
    if (
      typeof input.complianceDocsUrl === "string" &&
      input.complianceDocsUrl.trim()
    ) {
      normalized.complianceDocsUrl = input.complianceDocsUrl.trim();
    }

    return Object.keys(normalized).length > 0 ? normalized : Prisma.JsonNull;
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value === "number" && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private parseBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no"].includes(normalized)) {
        return false;
      }
    }

    if (typeof value === "number") {
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
        if (typeof entry === "string") {
          const trimmed = entry.trim();
          if (trimmed) {
            values.push(trimmed);
          }
        }
      }
    } else if (typeof value === "string") {
      for (const part of value.split(",")) {
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

    if (typeof value === "string") {
      const parts = value.split(",").map((part) => Number(part));
      if (parts.length === 4 && parts.every((part) => Number.isFinite(part))) {
        const [swLat, swLng, neLat, neLng] = parts as [
          number,
          number,
          number,
          number,
        ];
        return {
          southWest: { lat: swLat, lng: swLng },
          northEast: { lat: neLat, lng: neLng },
        };
      }
      return undefined;
    }

    if (typeof value === "object" && value !== null) {
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
          northEast: { lat: neLat, lng: neLng },
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
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
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
      dto.countryId,
    );
    const provinceId = this.pickString(
      parsedFilters.provinceId as string | undefined,
      dto.provinceId,
    );
    const cityId = this.pickString(
      parsedFilters.cityId as string | undefined,
      dto.cityId,
    );
    const suburbId = this.pickString(
      parsedFilters.suburbId as string | undefined,
      dto.suburbId,
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
      this.parseBoundsInput(parsedFilters.bounds) ??
      this.parseBoundsInput(dto.bounds);

    const bedrooms = this.parseNumber(parsedFilters.bedrooms) ?? dto.bedrooms;
    const bathrooms =
      this.parseNumber(parsedFilters.bathrooms) ?? dto.bathrooms;

    const furnishedInput = (
      (parsedFilters.furnished as string | undefined) ?? dto.furnished
    )
      ?.toString()
      .toUpperCase();
    let furnished: PropertyFurnishing | undefined;
    if (furnishedInput) {
      if (
        (Object.values(PropertyFurnishing) as string[]).includes(furnishedInput)
      ) {
        furnished = furnishedInput as PropertyFurnishing;
      }
    }

    const amenities =
      this.parseStringList(parsedFilters.amenities ?? dto.amenities) ??
      undefined;

    const minFloorArea =
      this.parseNumber(parsedFilters.minFloorArea) ?? dto.minFloorArea;
    const zoning = this.pickString(
      parsedFilters.zoning as string | undefined,
      dto.zoning,
    );
    const parking = this.parseBoolean(parsedFilters.parking) ?? dto.parking;

    const powerPhaseInput = (
      (parsedFilters.powerPhase as string | undefined) ?? dto.powerPhase
    )
      ?.toString()
      .toUpperCase();
    let powerPhase: PowerPhase | undefined;
    if (
      powerPhaseInput &&
      (Object.values(PowerPhase) as string[]).includes(powerPhaseInput)
    ) {
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
      powerPhase,
    };
  }

  listOwned(actor: AuthContext) {
    // #region agent log
    this.logDebug(
      "properties.service.ts:481",
      "listOwned entry",
      { actorRole: actor.role, actorId: actor.userId },
      "C",
    );
    // #endregion
    const include = {
      media: true,
      agentOwner: { select: { id: true, name: true, role: true } },
      landlord: { select: { id: true, name: true, role: true } },
      owner: { select: { id: true, name: true, role: true } },
      assignedAgent: { select: { id: true, name: true, role: true } },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          agent: { select: { id: true, name: true, role: true } },
          landlord: { select: { id: true, name: true, role: true } },
        },
      },
      managementAssignments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          assignedAgent: { select: { id: true, name: true, role: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          acceptedBy: { select: { id: true, name: true, role: true } },
        },
      },
      country: true,
      province: true,
      city: true,
      suburb: true,
      pendingGeo: true,
      verificationRequests: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    } satisfies Prisma.PropertyInclude;

    if (actor.role === Role.ADMIN) {
      return this.prisma.property
        .findMany({ orderBy: { createdAt: "desc" }, include })
        .then(async (properties: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug(
            "properties.service.ts:504",
            "listOwned before attachLocationToMany",
            {
              propertyCount: properties.length,
              firstPropertyId: properties[0]?.id,
              hasPrice: !!properties[0]?.price,
              priceType: typeof properties[0]?.price,
            },
            "B",
          );
          // #endregion
          return this.attachLocationToMany(properties);
        })
        .then(async (result: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug(
            "properties.service.ts:506",
            "listOwned after attachLocationToMany",
            { resultCount: result.length, firstResultId: result[0]?.id },
            "C",
          );
          // #endregion
          // Test JSON serialization before returning
          try {
            JSON.stringify(result);
            // #region agent log
            await this.logDebug(
              "properties.service.ts:510",
              "listOwned JSON serialization success",
              {},
              "B",
            );
            // #endregion
          } catch (serialError) {
            // #region agent log
            await this.logDebug(
              "properties.service.ts:513",
              "listOwned JSON serialization failed",
              {
                error:
                  serialError instanceof Error
                    ? serialError.message
                    : String(serialError),
              },
              "B",
            );
            // #endregion
            throw serialError;
          }
          return result;
        })
        .catch(async (error: unknown) => {
          // #region agent log
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorStack =
            error instanceof Error ? error.stack?.substring(0, 200) : undefined;
          await this.logDebug(
            "properties.service.ts:520",
            "listOwned error",
            { errorMessage, errorStack },
            "C",
          );
          // #endregion
          throw error;
        });
    }

    if (actor.role === Role.LANDLORD) {
      return this.prisma.property
        .findMany({
          where: { landlordId: actor.userId },
          orderBy: { createdAt: "desc" },
          include,
        })
        .then(async (properties: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug(
            "properties.service.ts:674",
            "listOwned LANDLORD before attachLocationToMany",
            { propertyCount: properties.length },
            "C",
          );
          // #endregion
          return this.attachLocationToMany(properties);
        })
        .then(async (result: Array<Record<string, unknown>>) => {
          // Test JSON serialization
          try {
            JSON.stringify(result);
            // #region agent log
            await this.logDebug(
              "properties.service.ts:681",
              "listOwned LANDLORD JSON serialization success",
              {},
              "B",
            );
            // #endregion
          } catch (serialError) {
            // #region agent log
            await this.logDebug(
              "properties.service.ts:684",
              "listOwned LANDLORD JSON serialization failed",
              {
                error:
                  serialError instanceof Error
                    ? serialError.message
                    : String(serialError),
              },
              "B",
            );
            // #endregion
            throw serialError;
          }
          return result;
        })
        .catch(async (error: unknown) => {
          // #region agent log
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          await this.logDebug(
            "properties.service.ts:691",
            "listOwned LANDLORD error",
            { errorMessage },
            "C",
          );
          // #endregion
          throw error;
        });
    }

    if (actor.role === Role.AGENT) {
      return this.prisma.property
        .findMany({
          where: { agentOwnerId: actor.userId },
          orderBy: { createdAt: "desc" },
          include,
        })
        .then(async (properties: Array<Record<string, unknown>>) => {
          // #region agent log
          await this.logDebug(
            "properties.service.ts:705",
            "listOwned AGENT before attachLocationToMany",
            { propertyCount: properties.length },
            "C",
          );
          // #endregion
          return this.attachLocationToMany(properties);
        })
        .then(async (result: Array<Record<string, unknown>>) => {
          // Test JSON serialization
          try {
            JSON.stringify(result);
            // #region agent log
            await this.logDebug(
              "properties.service.ts:712",
              "listOwned AGENT JSON serialization success",
              {},
              "B",
            );
            // #endregion
          } catch (serialError) {
            // #region agent log
            await this.logDebug(
              "properties.service.ts:715",
              "listOwned AGENT JSON serialization failed",
              {
                error:
                  serialError instanceof Error
                    ? serialError.message
                    : String(serialError),
              },
              "B",
            );
            // #endregion
            throw serialError;
          }
          return result;
        })
        .catch(async (error: unknown) => {
          // #region agent log
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          await this.logDebug(
            "properties.service.ts:722",
            "listOwned AGENT error",
            { errorMessage },
            "C",
          );
          // #endregion
          throw error;
        });
    }

    throw new ForbiddenException(
      "Only landlords, agents, or admins can manage listings",
    );
  }

  listVerifiedAgents() {
    return this.prisma.user.findMany({
      where: {
        role: Role.AGENT,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        trustScore: true,
        agentProfile: {
          select: { verifiedListingsCount: true, leadsCount: true },
        },
      },
      orderBy: {
        agentProfile: {
          verifiedListingsCount: "desc",
        },
      },
    });
  }

  searchAgents(query: string) {
    const searchTerm = query.trim();
    if (!searchTerm) {
      return this.listVerifiedAgents();
    }

    return this.prisma.user.findMany({
      where: {
        role: Role.AGENT,
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        trustScore: true,
        agentProfile: {
          select: {
            verifiedListingsCount: true,
            leadsCount: true,
            rating: true,
          },
        },
      },
      orderBy: {
        agentProfile: {
          verifiedListingsCount: "desc",
        },
      },
      take: 20, // Limit results for performance
    });
  }

  async searchAgencyAgents(query: string, actor: AuthContext) {
    const searchTerm = query.trim();
    if (searchTerm.length < 2) {
      return [];
    }
    const membership = await this.prisma.agencyMember.findFirst({
      where: { userId: actor.userId },
      select: { agencyId: true },
    });
    if (!membership?.agencyId) return [];

    return this.prisma.user.findMany({
      where: {
        role: { in: [Role.AGENT, Role.COMPANY_AGENT, Role.INDEPENDENT_AGENT] },
        agencyMemberships: { some: { agencyId: membership.agencyId } },
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        trustScore: true,
        agentProfile: {
          select: {
            verifiedListingsCount: true,
            leadsCount: true,
            rating: true,
          },
        },
      },
      orderBy: {
        agentProfile: {
          verifiedListingsCount: "desc",
        },
      },
      take: 20,
    });
  }

  async findById(id: string, actor?: AuthContext) {
    // #region agent log
    await this.logDebug(
      "properties.service.ts:735",
      "findById entry",
      { propertyId: id, actorRole: actor?.role },
      "D",
    );
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
        landlord: { select: { id: true, name: true, email: true, role: true } },
        agentOwner: {
          select: { id: true, name: true, email: true, role: true },
        },
        owner: { select: { id: true, name: true, email: true, role: true } },
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true },
        },
        managementAssignments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            assignedAgent: { select: { id: true, name: true, role: true } },
            createdBy: { select: { id: true, name: true, role: true } },
            acceptedBy: { select: { id: true, name: true, role: true } },
          },
        },
        verificationRequests: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!property) {
      throw new NotFoundException("Property not found");
    }

    // VISIBILITY CHECK
    const isOwner =
      actor &&
      (property.ownerId === actor.userId ||
        property.landlordId === actor.userId ||
        property.agentOwnerId === actor.userId);
    const isAdmin = actor?.role === Role.ADMIN;

    // If not Owner/Admin, enforce public status
    if (!isOwner && !isAdmin) {
      if (property.status !== PropertyStatus.VERIFIED) {
        throw new NotFoundException("Property not found"); // Hide non-public
      }
    }

    try {
      const result = this.attachLocation(property);
      // ... serialization checks removed for brevity in this block, assumed handled by attachLocation or caller
      return result;
    } catch (error: unknown) {
      throw error;
    }
  }

  async addInterest(propertyId: string, actor: AuthContext) {
    // Check if property exists
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException("Property not found");

    // 1. Create Interest Record (deduplicated)
    // Check if already interested
    const existing = await this.prisma.interest.findFirst({
      where: { propertyId, userId: actor.userId },
    });

    if (existing) return existing; // Already interested

    const interest = await this.prisma.interest.create({
      data: {
        propertyId,
        userId: actor.userId,
        status: InterestStatus.PENDING,
        pipelineStatus: "NEW",
        offerAmount: 0, // Default, or pass DTO if we want offer amount
      },
    });

    // 2. Create Lead
    await this.prisma.lead.create({
      data: {
        propertyId,
        userId: actor.userId,
        source: "WEB",
        contactPhone: "", // Should ideally fetch from User
        status: "NEW",
      },
    });

    // 3. Notify Owner (Notification logic omitted for brevity, would go here)

    return interest;
  }

  async incrementView(id: string) {
    // Upsert daily metric
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      await this.prisma.metricListingDaily.upsert({
        where: { listingId_day: { listingId: id, day: today } },
        update: { impressions: { increment: 1 }, sessions: { increment: 1 } }, // Simplified counting
        create: { listingId: id, day: today, impressions: 1, sessions: 1 },
      });
    } catch (err) {
      // Ignore stats errors gracefully
      this.logger.error("Failed to increment view", err);
    }
    return { success: true };
  }

  async create(dto: CreatePropertyDto, actor: AuthContext): Promise<any> {
    try {
      const landlordId =
        dto.landlordId ??
        (actor.role === Role.LANDLORD ? actor.userId : undefined);
      const agentOwnerId =
        dto.agentOwnerId ??
        (actor.role === Role.AGENT ? actor.userId : undefined);
      const ownerId = landlordId ?? actor.userId;
      const managedByType = dto.agentOwnerId
        ? "AGENT"
        : dto.agencyId
          ? "AGENCY"
          : "OWNER";
      const managedById =
        managedByType === "AGENT"
          ? agentOwnerId
          : managedByType === "AGENCY"
            ? dto.agencyId
            : ownerId;
      const assignedAgentId = managedByType === "AGENT" ? agentOwnerId : null;

      // Map actor role to ListingCreatorRole for audit tracking
      let createdByRole: ListingCreatorRole = ListingCreatorRole.LANDLORD;
      if (actor.role === Role.AGENT) {
        createdByRole = ListingCreatorRole.AGENT;
      } else if (actor.role === Role.ADMIN) {
        createdByRole = ListingCreatorRole.ADMIN;
      }

      // Phase C: Burst Listing Detection (Internal Signal)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentCount = await this.prisma.property.count({
        where: {
          OR: [{ landlordId: actor.userId }, { agentOwnerId: actor.userId }],
          createdAt: { gte: tenMinutesAgo },
        },
      });

      if (recentCount >= 5) {
        await this.riskService.recordRiskEvent({
          entityType: "USER",
          entityId: actor.userId,
          signalType: RiskSignalType.BURST_LISTING,
          scoreDelta: 20,
          notes: `User created ${recentCount} listings in 10 minutes. Possible automation/spam.`,
        });
      }

      let location: Awaited<ReturnType<typeof this.geo.resolveLocation>>;
      try {
        location = await this.geo.resolveLocation({
          countryId: dto.countryId ?? null,
          provinceId: dto.provinceId ?? null,
          cityId: dto.cityId ?? null,
          suburbId: dto.suburbId ?? null,
          pendingGeoId: dto.pendingGeoId ?? null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to resolve location for property creation: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
        // DIAGNOSTIC: Return detailed location resolution error
        throw new BadRequestException({
          message: "Property creation validation failed",
          issues: [
            {
              path: "location",
              message: `Invalid location: ${errorMessage}`,
              code: "custom",
              locationInput: {
                countryId: dto.countryId ?? null,
                provinceId: dto.provinceId ?? null,
                cityId: dto.cityId ?? null,
                suburbId: dto.suburbId ?? null,
                pendingGeoId: dto.pendingGeoId ?? null,
              },
            },
          ],
        });
      }

      const availableFrom =
        dto.availability === PropertyAvailability.DATE && dto.availableFrom
          ? new Date(dto.availableFrom)
          : null;
      const commercialFields = this.normalizeCommercialFields(
        dto.commercialFields,
      );

      // Build location data - use conditional spreading only for truly optional fields
      const resolvedCountryId = location.country?.id ?? dto.countryId ?? null;
      const resolvedProvinceId =
        location.province?.id ?? dto.provinceId ?? null;
      const resolvedCityId = location.city?.id ?? dto.cityId ?? null;
      const resolvedSuburbId = location.suburb?.id ?? dto.suburbId ?? null;
      const resolvedPendingGeoId = location.pendingGeo?.id ?? null;

      const createdProperty = await this.prisma.property.create({
        data: {
          title: dto.title,
          ...(landlordId && { landlordId }),
          ...(agentOwnerId && { agentOwnerId }),
          ownerId,
          managedByType: managedByType as any,
          managedById: managedById ?? undefined,
          assignedAgentId: assignedAgentId ?? undefined,
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
          lat: typeof dto.lat === "number" ? dto.lat : null,
          lng: typeof dto.lng === "number" ? dto.lng : null,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          areaSqm: dto.areaSqm && dto.areaSqm > 0 ? dto.areaSqm : null,
          amenities: dto.amenities ?? [],
          furnishing: dto.furnishing ?? PropertyFurnishing.NONE,
          availability: dto.availability ?? PropertyAvailability.IMMEDIATE,
          availableFrom,
          commercialFields,
          description: dto.description,
          status: PropertyStatus.DRAFT, // FORCE DRAFT
          createdByRole,
        },
        include: {
          country: true,
          province: true,
          city: true,
          suburb: true,
          pendingGeo: true,
        },
      });

      await this.audit.logAction({
        action: "property.create",
        actorId: actor.userId,
        targetType: "property",
        targetId: createdProperty.id,
        metadata: { landlordId, agentOwnerId },
      });

      try {
        return this.attachLocation(createdProperty);
      } catch (attachError) {
        // If attachLocation fails, return property without location data
        const errorMessage =
          attachError instanceof Error
            ? attachError.message
            : String(attachError);
        this.logger.error(
          `Failed to attach location to created property ${createdProperty.id}: ${errorMessage}`,
          attachError instanceof Error ? attachError.stack : undefined,
        );

        // Return a minimal serializable version
        const {
          country,
          province,
          city,
          suburb,
          pendingGeo,
          ...cleanProperty
        } = createdProperty as any;
        return this.convertDecimalsToNumbers({
          ...cleanProperty,
          countryName: null,
          provinceName: null,
          cityName: null,
          suburbName: null,
          location: {
            countryId: createdProperty.countryId,
            country: null,
            provinceId: createdProperty.provinceId,
            province: null,
            cityId: createdProperty.cityId,
            city: null,
            suburbId: createdProperty.suburbId,
            suburb: null,
            pendingGeoId: createdProperty.pendingGeoId,
            pendingGeo: null,
            lat: createdProperty.lat,
            lng: createdProperty.lng,
          },
        });
      }
      return this.attachLocation(createdProperty);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create property: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async publish(id: string, actor: AuthContext) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException("Property not found");

    // Check Ownership
    if (
      property.landlordId !== actor.userId &&
      property.agentOwnerId !== actor.userId &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException("Not authorized to publish this property");
    }

    // Check Completeness
    if (!property.title || !property.price || !property.type) {
      throw new BadRequestException("Property is incomplete");
    }

    let newStatus: PropertyStatus = PropertyStatus.PENDING_VERIFY;

    // Only keep VERIFIED if property was already VERIFIED (e.g., unpause case)
    if (property.status === PropertyStatus.VERIFIED) {
      newStatus = PropertyStatus.VERIFIED;
    } else if (
      property.verificationLevel === "VERIFIED" ||
      property.verificationLevel === "TRUSTED"
    ) {
      // Auto-verify if the property itself has been verified before
      newStatus = PropertyStatus.VERIFIED;
    }
    // Admin publish should NOT auto-verify - require explicit verification process

    const updated = await this.prisma.property.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.audit.logAction({
      action: "PROPERTY_PUBLISH",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: { status: newStatus },
    });
    return updated;
  }

  async updateStatus(id: string, status: PropertyStatus, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(property, actor);

    const updated = await this.prisma.property.update({
      where: { id },
      data: { status },
    });

    await this.audit.logAction({
      action: "PROPERTY_STATUS_UPDATE",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: { status },
    });

    return updated;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    actor: AuthContext,
  ): Promise<any> {
    const existing = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(existing, actor);

    const {
      amenities,
      price: priceInput,
      availableFrom: availableFromInput,
      commercialFields,
      ...rest
    } = dto;
    const price =
      priceInput !== undefined ? new Prisma.Decimal(priceInput) : undefined;

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
          pendingGeoId: pendingGeoId ?? null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to resolve location for property update ${id}: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
        );
        throw new BadRequestException(`Invalid location: ${errorMessage}`);
      }
    } else {
      // User is not updating location - use existing location
      location = {
        country: existing.country,
        province: existing.province,
        city: existing.city,
        suburb: existing.suburb,
        pendingGeo: existing.pendingGeo,
      };
    }

    const availableFrom =
      availableFromInput !== undefined
        ? new Date(availableFromInput)
        : rest.availability === PropertyAvailability.IMMEDIATE
          ? null
          : undefined;
    const normalizedCommercialFields =
      commercialFields !== undefined
        ? this.normalizeCommercialFields(commercialFields)
        : undefined;

    const filtered = this.removeUndefined(other);

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        ...filtered,
        ...(isUpdatingLocation
          ? {
            countryId: location.country?.id ?? null,
            provinceId: location.province?.id ?? null,
            cityId: location.city?.id ?? null,
            suburbId: location.suburb?.id ?? null,
            pendingGeoId: location.pendingGeo?.id ?? null,
          }
          : {}),
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
        ...(price !== undefined ? { price } : {}),
        amenities: amenities ?? existing.amenities,
        ...(availableFrom !== undefined ? { availableFrom } : {}),
        ...(normalizedCommercialFields !== undefined
          ? { commercialFields: normalizedCommercialFields }
          : {}),
      },
      include: {
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true,
      },
    });

    await this.audit.logAction({
      action: "property.update",
      actorId: actor.userId,
      targetType: "property",
      targetId: property.id,
      metadata: dto,
    });

    return this.attachLocation(property);
  }

  async remove(id: string, actor: AuthContext) {
    const existing = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(existing, actor);

    await this.prisma.property.delete({ where: { id } });

    await this.audit.logAction({
      action: "property.delete",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
    });

    return { success: true, id };
  }

  async assignVerifiedAgent(
    id: string,
    dto: AssignAgentDto,
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    // Validate agentId is provided
    if (!dto.agentId || dto.agentId.trim() === "") {
      throw new BadRequestException(
        "Agent ID is required. Please select an agent.",
      );
    }

    // Find agent - relaxed query to allow any agent user
    const agent = await this.prisma.user.findFirst({
      where: {
        id: dto.agentId,
        role: Role.AGENT,
      },
      select: {
        id: true,
        name: true,
        agentProfile: {
          select: {
            kycStatus: true,
            verifiedListingsCount: true,
          },
        },
      },
    });

    if (!agent) {
      throw new BadRequestException("Agent not found or user is not an agent");
    }

    const landlordId = property.landlordId ?? actor.userId;
    const serviceFeeUsdCents =
      dto.serviceFeeUsd !== undefined
        ? Math.round(dto.serviceFeeUsd * 100)
        : null;

    if (serviceFeeUsdCents !== null && serviceFeeUsdCents < 0) {
      throw new BadRequestException("Service fee must be positive");
    }

    // Create assignment with PENDING status
    // Property agentOwnerId will only be set after payment completion or agent acceptance
    const assignment = await this.prisma.agentAssignment.create({
      data: {
        propertyId: id,
        landlordId,
        agentId: agent.id,
        serviceFeeUsdCents: serviceFeeUsdCents ?? undefined,
        landlordPaysFee: true,
        status: "PENDING",
      },
    });

    await this.prisma.listingManagementAssignment.create({
      data: {
        propertyId: id,
        ownerId: landlordId,
        managedByType: "AGENT",
        managedById: agent.id,
        assignedAgentId: agent.id,
        serviceFeeUsdCents: serviceFeeUsdCents ?? undefined,
        landlordPaysFee: true,
        status: "CREATED",
        createdById: actor.userId,
      },
    });

    // Update property landlordId (but NOT agentOwnerId yet)
    await this.prisma.property.update({
      where: { id },
      data: {
        landlordId,
      },
    });

    // Fees are generated after acceptance

    await this.audit.logAction({
      action: "property.assignAgent",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: {
        agentId: agent.id,
        serviceFeeUsd: dto.serviceFeeUsd ?? null,
      },
    });

    // Log activity
    await this.logActivity(
      id,
      ListingActivityType.AGENT_ASSIGNED,
      actor.userId,
      {
        agentId: dto.agentId,
        agentName: agent.name,
      },
    );

    return assignment;
  }

  async updateServiceFee(
    id: string,
    dto: UpdateServiceFeeDto,
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    const latestAssignment = await this.prisma.agentAssignment.findFirst({
      where: { propertyId: id },
      orderBy: { createdAt: "desc" },
    });

    if (!latestAssignment) {
      throw new BadRequestException(
        "No agent assignment found. Please assign an agent first.",
      );
    }

    // Convert to cents if a value is provided, otherwise set to null to clear the fee
    // In Prisma, null explicitly sets the field to NULL, while undefined means "don't update"
    const serviceFeeUsdCents =
      dto.serviceFeeUsd !== null && dto.serviceFeeUsd !== undefined
        ? Math.round(dto.serviceFeeUsd * 100)
        : null;

    if (serviceFeeUsdCents !== null && serviceFeeUsdCents < 0) {
      throw new BadRequestException("Service fee must be positive");
    }

    const updated = await this.prisma.agentAssignment.update({
      where: { id: latestAssignment.id },
      data: {
        // Pass null directly to set the field to NULL in the database
        // Using undefined would mean "don't update this field" in Prisma
        serviceFeeUsdCents: serviceFeeUsdCents,
      },
    });

    await this.audit.logAction({
      action: "property.updateServiceFee",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: {
        assignmentId: updated.id,
        serviceFeeUsd: dto.serviceFeeUsd,
      },
    });

    return updated;
  }

  async resignAgent(id: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    // Find the latest active assignment (not RESIGNED)
    const latestAssignment = await this.prisma.agentAssignment.findFirst({
      where: {
        propertyId: id,
        status: { not: "RESIGNED" },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        agent: { select: { id: true, name: true } },
      },
    });

    if (!latestAssignment) {
      throw new BadRequestException(
        "No active agent assignment found for this property",
      );
    }

    // Update assignment status to RESIGNED
    await this.prisma.agentAssignment.update({
      where: { id: latestAssignment.id },
      data: { status: "RESIGNED" },
    });

    // Clear the agentOwnerId from the property if it was set
    if (property.agentOwnerId === latestAssignment.agentId) {
      await this.prisma.property.update({
        where: { id },
        data: {
          agentOwnerId: null,
          assignedAgentId: null,
          managedByType: "OWNER" as any,
          managedById: property.ownerId ?? property.landlordId ?? null,
          isManaged: false,
        },
      });
    }

    const latestManagement =
      await this.prisma.listingManagementAssignment.findFirst({
        where: {
          propertyId: id,
          assignedAgentId: latestAssignment.agentId,
          managedByType: "AGENT",
          status: { in: ["CREATED", "ACCEPTED"] },
        },
        orderBy: { createdAt: "desc" },
      });
    if (latestManagement) {
      await this.prisma.listingManagementAssignment.update({
        where: { id: latestManagement.id },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });
    }

    // Cancel any pending agent fee payments
    await this.prisma.listingPayment.updateMany({
      where: {
        propertyId: id,
        type: ListingPaymentType.AGENT_FEE,
        status: ListingPaymentStatus.PENDING,
        metadata: {
          path: ["assignmentId"],
          equals: latestAssignment.id,
        },
      },
      data: {
        status: ListingPaymentStatus.CANCELLED,
      },
    });

    await this.audit.logAction({
      action: "property.resignAgent",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: {
        assignmentId: latestAssignment.id,
        agentId: latestAssignment.agentId,
        agentName: latestAssignment.agent?.name,
      },
    });

    // Log activity
    await this.logActivity(
      id,
      ListingActivityType.AGENT_ASSIGNED, // Using AGENT_ASSIGNED with action: resigned in metadata
      actor.userId,
      {
        action: "resigned",
        agentId: latestAssignment.agentId,
        agentName: latestAssignment.agent?.name,
      },
    );

    return { success: true, resignedAgentId: latestAssignment.agentId };
  }

  /**
   * Agent accepts a pending assignment
   * This activates the assignment and sets the property's agentOwnerId
   */
  async acceptAssignment(assignmentId: string, actor: AuthContext) {
    // Find the assignment
    const assignment = await this.prisma.agentAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        property: { select: { id: true, title: true, landlordId: true } },
        landlord: { select: { id: true, name: true } },
      },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    // Verify the actor is the assigned agent
    if (assignment.agentId !== actor.userId && actor.role !== Role.ADMIN) {
      throw new ForbiddenException("You are not the assigned agent");
    }

    // Verify assignment is in PENDING status
    if (assignment.status !== "PENDING") {
      throw new BadRequestException(
        `Cannot accept assignment with status: ${assignment.status}`,
      );
    }

    // Update assignment to ACTIVE and set acceptedAt
    const updated = await this.prisma.agentAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    // Set the agentOwnerId on the property
    await this.prisma.property.update({
      where: { id: assignment.propertyId },
      data: {
        agentOwnerId: actor.userId,
        managedByType: "AGENT" as any,
        managedById: actor.userId,
        assignedAgentId: actor.userId,
        isManaged: true,
      },
    });

    const managementAssignment =
      await this.prisma.listingManagementAssignment.findFirst({
        where: {
          propertyId: assignment.propertyId,
          assignedAgentId: actor.userId,
          managedByType: "AGENT",
          status: "CREATED",
        },
        orderBy: { createdAt: "desc" },
      });

    if (managementAssignment) {
      await this.prisma.listingManagementAssignment.update({
        where: { id: managementAssignment.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedById: actor.userId,
        },
      });
    }

    if (assignment.serviceFeeUsdCents && assignment.serviceFeeUsdCents > 0) {
      await this.prisma.listingPayment.create({
        data: {
          propertyId: assignment.propertyId,
          type: ListingPaymentType.ASSIGNMENT_FEE,
          amountCents: assignment.serviceFeeUsdCents,
          currency: Currency.USD,
          status: ListingPaymentStatus.PENDING,
          reference: `ASSIGNMENT_FEE_${assignment.propertyId}_${assignment.id}`,
          metadata: {
            assignmentId: assignment.id,
            agentId: assignment.agentId,
          },
        },
      });
    }

    await this.audit.logAction({
      action: "property.acceptAssignment",
      actorId: actor.userId,
      targetType: "property",
      targetId: assignment.propertyId,
      metadata: {
        assignmentId: assignment.id,
        landlordId: assignment.landlordId,
      },
    });

    // Log activity
    await this.logActivity(
      assignment.propertyId,
      ListingActivityType.AGENT_ASSIGNED,
      actor.userId,
      {
        action: "accepted",
        assignmentId: assignment.id,
        landlordName: assignment.landlord?.name,
      },
    );

    return updated;
  }

  async createManagementAssignment(
    id: string,
    dto: CreateManagementAssignmentDto,
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    const ownerId = property.ownerId ?? property.landlordId ?? actor.userId;
    if (!property.ownerId && ownerId) {
      await this.prisma.property.update({
        where: { id },
        data: { ownerId },
      });
    }

    const active = await this.prisma.listingManagementAssignment.findFirst({
      where: {
        propertyId: id,
        status: { in: ["CREATED", "ACCEPTED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (active) {
      throw new BadRequestException(
        "A management request is already active for this listing",
      );
    }

    if (dto.managedByType === "AGENT" && !dto.managedById) {
      throw new BadRequestException("Agent is required for management");
    }
    if (dto.managedByType === "AGENCY" && !dto.managedById) {
      throw new BadRequestException("Agency is required for management");
    }

    if (dto.managedByType === "AGENT" && dto.managedById) {
      const agent = await this.prisma.user.findUnique({
        where: { id: dto.managedById },
        select: { id: true, role: true },
      });
      if (
        !agent ||
        !["AGENT", "INDEPENDENT_AGENT"].includes(agent.role as string)
      ) {
        throw new BadRequestException("Selected user is not an agent");
      }
    }

    if (dto.managedByType === "AGENCY" && dto.managedById) {
      const agency = await this.prisma.agency.findUnique({
        where: { id: dto.managedById },
        select: { id: true },
      });
      if (!agency) {
        throw new BadRequestException("Agency not found");
      }
      if (dto.assignedAgentId) {
        const member = await this.prisma.agencyMember.findFirst({
          where: {
            agencyId: dto.managedById,
            userId: dto.assignedAgentId,
          },
          select: { id: true },
        });
        if (!member) {
          throw new BadRequestException(
            "Selected agent does not belong to this agency",
          );
        }
      }
    }

    const serviceFeeUsdCents =
      dto.serviceFeeUsd !== undefined
        ? Math.round(dto.serviceFeeUsd * 100)
        : null;

    const assignment = await this.prisma.listingManagementAssignment.create({
      data: {
        propertyId: id,
        ownerId,
        managedByType: dto.managedByType as any,
        managedById: dto.managedById ?? ownerId,
        assignedAgentId: dto.assignedAgentId ?? undefined,
        serviceFeeUsdCents: serviceFeeUsdCents ?? undefined,
        landlordPaysFee: dto.landlordPaysFee ?? true,
        status: "CREATED",
        createdById: actor.userId,
        notes: dto.notes ?? undefined,
      },
    });

    await this.audit.logAction({
      action: "property.management.create",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: {
        assignmentId: assignment.id,
        managedByType: assignment.managedByType,
        managedById: assignment.managedById,
        assignedAgentId: assignment.assignedAgentId,
      },
    });

    await this.logActivity(
      id,
      ListingActivityType.AGENT_ASSIGNED,
      actor.userId,
      {
        action: "management_requested",
        assignmentId: assignment.id,
        managedByType: assignment.managedByType,
        managedById: assignment.managedById,
        assignedAgentId: assignment.assignedAgentId,
      },
    );

    return assignment;
  }

  async acceptManagementAssignment(assignmentId: string, actor: AuthContext) {
    const assignment = await this.prisma.listingManagementAssignment.findUnique(
      {
        where: { id: assignmentId },
        include: { property: true },
      },
    );
    if (!assignment) {
      throw new NotFoundException("Management assignment not found");
    }
    if (assignment.status !== "CREATED") {
      throw new BadRequestException(
        `Cannot accept assignment with status: ${assignment.status}`,
      );
    }

    if (actor.role !== Role.ADMIN) {
      if (assignment.managedByType === "AGENT") {
        if (assignment.managedById !== actor.userId) {
          throw new ForbiddenException("You are not the assigned manager");
        }
      }
      if (assignment.managedByType === "AGENCY") {
        if (!assignment.managedById) {
          throw new BadRequestException("Agency assignment is missing agency");
        }
        const isAdmin = await this.isAgencyAdmin(
          assignment.managedById,
          actor.userId,
        );
        if (!isAdmin) {
          throw new ForbiddenException("You are not an agency admin");
        }
      }
    }

    const managedByType = assignment.managedByType;
    const assignedAgentId =
      managedByType === "AGENT"
        ? assignment.managedById
        : assignment.assignedAgentId ?? null;

    await this.prisma.$transaction(async (tx) => {
      await tx.listingManagementAssignment.updateMany({
        where: {
          propertyId: assignment.propertyId,
          status: "ACCEPTED",
          id: { not: assignment.id },
        },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });
      await tx.listingManagementAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedById: actor.userId,
        },
      });

      await tx.property.update({
        where: { id: assignment.propertyId },
        data: {
          managedByType: managedByType as any,
          managedById: assignment.managedById ?? undefined,
          assignedAgentId: assignedAgentId ?? undefined,
          isManaged: managedByType !== "OWNER",
        },
      });

      if (assignment.serviceFeeUsdCents && assignment.serviceFeeUsdCents > 0) {
        await tx.listingPayment.create({
          data: {
            propertyId: assignment.propertyId,
            type: ListingPaymentType.ASSIGNMENT_FEE,
            amountCents: assignment.serviceFeeUsdCents,
            currency: Currency.USD,
            status: ListingPaymentStatus.PENDING,
            reference: `ASSIGNMENT_FEE_${assignment.propertyId}_${assignment.id}`,
            metadata: {
              managementAssignmentId: assignment.id,
              managedByType: assignment.managedByType,
              managedById: assignment.managedById,
              assignedAgentId: assignment.assignedAgentId,
            },
          },
        });
      }
    });

    await this.audit.logAction({
      action: "property.management.accept",
      actorId: actor.userId,
      targetType: "property",
      targetId: assignment.propertyId,
      metadata: { assignmentId },
    });

    await this.logActivity(
      assignment.propertyId,
      ListingActivityType.AGENT_ASSIGNED,
      actor.userId,
      {
        action: "management_accepted",
        assignmentId,
        managedByType: assignment.managedByType,
        managedById: assignment.managedById,
        assignedAgentId: assignment.assignedAgentId,
      },
    );

    return { success: true };
  }

  async declineManagementAssignment(assignmentId: string, actor: AuthContext) {
    const assignment = await this.prisma.listingManagementAssignment.findUnique(
      {
        where: { id: assignmentId },
      },
    );
    if (!assignment) {
      throw new NotFoundException("Management assignment not found");
    }
    if (assignment.status !== "CREATED") {
      throw new BadRequestException(
        `Cannot decline assignment with status: ${assignment.status}`,
      );
    }

    await this.prisma.listingManagementAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "DECLINED",
        declinedAt: new Date(),
        acceptedById: actor.userId,
      },
    });

    await this.audit.logAction({
      action: "property.management.decline",
      actorId: actor.userId,
      targetType: "property",
      targetId: assignment.propertyId,
      metadata: { assignmentId },
    });

    await this.logActivity(
      assignment.propertyId,
      ListingActivityType.AGENT_ASSIGNED,
      actor.userId,
      {
        action: "management_declined",
        assignmentId,
        managedByType: assignment.managedByType,
        managedById: assignment.managedById,
        assignedAgentId: assignment.assignedAgentId,
      },
    );

    return { success: true };
  }

  async endManagementAssignment(assignmentId: string, actor: AuthContext) {
    const assignment = await this.prisma.listingManagementAssignment.findUnique(
      {
        where: { id: assignmentId },
        include: { property: true },
      },
    );
    if (!assignment) {
      throw new NotFoundException("Management assignment not found");
    }
    if (!["CREATED", "ACCEPTED"].includes(assignment.status)) {
      throw new BadRequestException(
        `Cannot end assignment with status: ${assignment.status}`,
      );
    }

    if (actor.role !== Role.ADMIN) {
      const isOwner = assignment.ownerId === actor.userId;
      let isManager = false;
      if (assignment.managedByType === "AGENT") {
        isManager = assignment.managedById === actor.userId;
      }
      if (assignment.managedByType === "AGENCY" && assignment.managedById) {
        isManager = await this.isAgencyAdmin(
          assignment.managedById,
          actor.userId,
        );
      }
      if (!isOwner && !isManager) {
        throw new ForbiddenException("Not authorized to end management");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.listingManagementAssignment.update({
        where: { id: assignmentId },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });
      await tx.property.update({
        where: { id: assignment.propertyId },
        data: {
          managedByType: "OWNER" as any,
          managedById: assignment.ownerId,
          assignedAgentId: null,
          isManaged: false,
        },
      });
    });

    await this.audit.logAction({
      action: "property.management.end",
      actorId: actor.userId,
      targetType: "property",
      targetId: assignment.propertyId,
      metadata: { assignmentId },
    });

    await this.logActivity(
      assignment.propertyId,
      ListingActivityType.AGENT_ASSIGNED,
      actor.userId,
      {
        action: "management_ended",
        assignmentId,
        managedByType: assignment.managedByType,
        managedById: assignment.managedById,
        assignedAgentId: assignment.assignedAgentId,
      },
    );

    return { success: true };
  }

  async setOperatingAgent(
    id: string,
    dto: SetOperatingAgentDto,
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(id);
    if (actor.role !== Role.ADMIN) {
      if (property.managedByType === "AGENCY") {
        if (!property.managedById) {
          throw new BadRequestException("Listing is missing agency manager");
        }
        const isAdmin = await this.isAgencyAdmin(
          property.managedById,
          actor.userId,
        );
        if (!isAdmin) {
          throw new ForbiddenException("You are not an agency admin");
        }
      } else if (property.managedByType === "OWNER") {
        this.ensureLandlordAccess(property, actor);
      } else {
        throw new ForbiddenException("Only agency or owner can assign agent");
      }
    }

    if (dto.assignedAgentId) {
      const agent = await this.prisma.user.findUnique({
        where: { id: dto.assignedAgentId },
        select: { id: true, role: true },
      });
      if (
        !agent ||
        !["AGENT", "INDEPENDENT_AGENT"].includes(agent.role as string)
      ) {
        throw new BadRequestException("Selected user is not an agent");
      }
      if (property.managedByType === "AGENCY" && property.managedById) {
        const member = await this.prisma.agencyMember.findFirst({
          where: {
            agencyId: property.managedById,
            userId: dto.assignedAgentId,
          },
          select: { id: true },
        });
        if (!member) {
          throw new BadRequestException(
            "Selected agent does not belong to this agency",
          );
        }
      }
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: { assignedAgentId: dto.assignedAgentId ?? null },
    });

    await this.audit.logAction({
      action: "property.management.assign_agent",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: { assignedAgentId: dto.assignedAgentId ?? null },
    });

    return updated;
  }

  /**
   * Activate an agent assignment after payment is completed
   * Called by the payment system when agent fee payment is successful
   */
  async activateAssignmentAfterPayment(assignmentId: string) {
    const assignment = await this.prisma.agentAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    if (assignment.status !== "PENDING") {
      // Already activated or resigned
      return assignment;
    }

    // Update to ACTIVE
    const updated = await this.prisma.agentAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    // Set the agentOwnerId on the property
    await this.prisma.property.update({
      where: { id: assignment.propertyId },
      data: { agentOwnerId: assignment.agentId },
    });

    await this.audit.logAction({
      action: "property.assignmentActivated",
      actorId: undefined,
      targetType: "property",
      targetId: assignment.propertyId,
      metadata: {
        assignmentId: assignment.id,
        trigger: "payment_completed",
      },
    });

    return updated;
  }

  async updateDealConfirmation(
    id: string,
    dto: UpdateDealConfirmationDto,
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    const isConfirming = dto.confirmed;

    const updated = await this.prisma.$transaction(async (tx) => {
      const propertyUpdate = await tx.property.update({
        where: { id },
        data: {
          dealConfirmedAt: isConfirming ? new Date() : null,
          dealConfirmedById: isConfirming ? actor.userId : null,
        },
        include: {
          media: true,
          agentOwner: { select: { id: true, name: true, role: true } },
          landlord: { select: { id: true, name: true, role: true } },
          assignments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              agent: { select: { id: true, name: true, role: true } },
              landlord: { select: { id: true, name: true, role: true } },
            },
          },
          country: true,
          province: true,
          city: true,
          suburb: true,
          pendingGeo: true,
        },
      });

      const existingEvent = await tx.rewardEvent.findFirst({
        where: { type: RewardEventType.SALE_CONFIRMED, refId: id },
      });

      const agentId = propertyUpdate.agentOwnerId;

      if (isConfirming) {
        // When listing is confirmed:
        // - ACCEPTED offer → CONFIRMED
        // - All other offers → REJECTED
        const acceptedOffer = await tx.interest.findFirst({
          where: {
            propertyId: id,
            status: InterestStatus.ACCEPTED,
          },
        });

        if (acceptedOffer) {
          // Confirm the accepted offer
          await tx.interest.update({
            where: { id: acceptedOffer.id },
            data: { status: InterestStatus.CONFIRMED },
          });

          // Reject all other offers
          await tx.interest.updateMany({
            where: {
              propertyId: id,
              id: { not: acceptedOffer.id },
              status: { not: InterestStatus.CONFIRMED },
            },
            data: { status: InterestStatus.REJECTED },
          });
        }

        if (agentId) {
          if (existingEvent) {
            if (existingEvent.agentId !== agentId) {
              await tx.rewardEvent.update({
                where: { id: existingEvent.id },
                data: { agentId },
              });
            }
          } else {
            await tx.rewardEvent.create({
              data: {
                agentId,
                type: RewardEventType.SALE_CONFIRMED,
                points: SALE_CONFIRMED_POINTS,
                usdCents: SALE_CONFIRMED_USD_CENTS,
                refId: id,
              },
            });
          }
        }
      } else if (existingEvent) {
        await tx.rewardEvent.delete({ where: { id: existingEvent.id } });
      }

      return propertyUpdate;
    });

    await this.audit.logAction({
      action: "property.dealConfirmation",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: { confirmed: dto.confirmed },
    });

    // Log activities for offer confirmations/rejections (done after transaction)
    if (dto.confirmed) {
      const acceptedOffer = await this.prisma.interest.findFirst({
        where: {
          propertyId: id,
          status: InterestStatus.CONFIRMED,
        },
      });
      if (acceptedOffer) {
        await this.logActivity(
          id,
          ListingActivityType.OFFER_CONFIRMED,
          actor.userId,
          {
            offerId: acceptedOffer.id,
            offerAmount: acceptedOffer.offerAmount,
          },
        );
        const rejectedCount = await this.prisma.interest.count({
          where: {
            propertyId: id,
            status: InterestStatus.REJECTED,
          },
        });
        if (rejectedCount > 0) {
          await this.logActivity(
            id,
            ListingActivityType.OFFER_REJECTED,
            actor.userId,
            {
              count: rejectedCount,
              reason: "Deal confirmed",
            },
          );
        }
      }
    }

    return this.attachLocation(updated);
  }

  async listMessages(id: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);

    // Check if actor is owner or agent
    const isOwner =
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId;
    const isAdmin = actor.role === Role.ADMIN;

    let where: any = { propertyId: id };

    if (!isOwner && !isAdmin) {
      // Regular users only see their own messages
      where = {
        propertyId: id,
        OR: [{ senderId: actor.userId }, { recipientId: actor.userId }],
      };
    }

    const messages = (await this.prisma.propertyMessage.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
      },
    })) as Array<
      {
        id: string;
        recipientId: string;
        readAt: Date | null;
      } & Record<string, unknown>
    >;

    const unreadForActor = messages
      .filter(
        (message) => message.recipientId === actor.userId && !message.readAt,
      )
      .map((message) => message.id);

    if (unreadForActor.length) {
      await this.prisma.propertyMessage.updateMany({
        where: { id: { in: unreadForActor } },
        data: { readAt: new Date() },
      });
    }

    return messages;
  }

  async listInterests(id: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(property, actor);

    return this.prisma.interest.findMany({
      where: { propertyId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, isVerified: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
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
        agentOwner: { select: { id: true } },
      },
    });

    if (!property) {
      throw new NotFoundException("Property not found");
    }

    // Determine recipient
    let recipientId: string | null = dto.recipientId ?? null;

    const isOwner = property.landlordId === actor.userId;
    const isAgent =
      property.agentOwnerId === actor.userId ||
      (property as any).assignedAgentId === actor.userId;

    // Chat visibility guard: Only ACCEPTED or CONFIRMED offers allow chat
    // Owners and agents can always chat
    if (!isOwner && !isAgent) {
      const userInterest = await this.prisma.interest.findFirst({
        where: {
          propertyId: id,
          userId: actor.userId,
          status: { in: [InterestStatus.ACCEPTED, InterestStatus.CONFIRMED] },
        },
      });

      if (!userInterest) {
        throw new ForbiddenException(
          "Chat is only available for accepted or confirmed offers. Please wait for your offer to be accepted.",
        );
      }
    }

    if (!recipientId) {
      if (isOwner || isAgent) {
        // Owner/Agent replying - try to find the last person who messaged
        const lastIncoming = await this.prisma.propertyMessage.findFirst({
          where: {
            propertyId: id,
            senderId: { not: actor.userId },
          },
          orderBy: { createdAt: "desc" },
          select: { senderId: true },
        });

        if (lastIncoming) {
          recipientId = lastIncoming.senderId;
        } else {
          // No incoming messages, fallback to Landlord <-> Agent
          recipientId = isOwner
            ? (property as any).assignedAgentId ??
            property.agentOwnerId ??
            property.landlordId
            : property.landlordId;
        }
      } else {
        // Interested party messaging the owner (Agent preferred, else Landlord)
        recipientId =
          (property as any).assignedAgentId ??
          property.agentOwnerId ??
          property.landlordId;
      }
    }

    // A property must have either a landlord or an agent owner to receive messages
    // This ensures data quality and prevents invalid message states
    if (!recipientId) {
      throw new BadRequestException(
        "Cannot send message: This property has no assigned owner. Please contact support if you believe this is an error.",
      );
    }

    const containsContactInfo =
      /@[A-Z0-9._%+-]+\.[A-Z]{2,}/i.test(dto.body) ||
      /\+?\d[\d\s().-]{6,}/.test(dto.body);
    if (containsContactInfo) {
      const viewing = await this.prisma.viewing.findFirst({
        where: {
          propertyId: id,
          statusV2: { in: ["ACCEPTED", "COMPLETED"] },
        },
      });
      const verifiedPayment = await this.prisma.rentPayment.findFirst({
        where: {
          propertyId: id,
          isVerified: true,
        },
      });
      if (!viewing && !verifiedPayment) {
        throw new BadRequestException(
          "Contact details can be shared only after a confirmed viewing or verified payment",
        );
      }
    }

    const message = await this.prisma.propertyMessage.create({
      data: {
        propertyId: id,
        senderId: actor.userId,
        recipientId,
        body: dto.body,
        containsContactInfo,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
      },
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
        pendingGeo: true,
      },
    });

    if (!property) {
      throw new NotFoundException("Property not found");
    }

    return property;
  }

  private ensureCanMutate(
    property: { landlordId: string | null; agentOwnerId: string | null },
    actor: AuthContext,
  ) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (actor.role === Role.LANDLORD && property.landlordId === actor.userId) {
      return;
    }

    if (actor.role === Role.AGENT && property.agentOwnerId === actor.userId) {
      return;
    }

    throw new ForbiddenException(
      "You do not have permission to modify this property",
    );
  }

  private ensureLandlordAccess(
    property: { landlordId: string | null },
    actor: AuthContext,
  ) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (property.landlordId === actor.userId) {
      return;
    }

    throw new ForbiddenException("Only the landlord can perform this action");
  }

  private ensureConversationAccess(
    property: { landlordId: string | null; agentOwnerId: string | null },
    actor: AuthContext,
  ) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId
    ) {
      return;
    }

    // TODO: check if user is a lead/tenant
    // For now, allow any user to message? No, that's unsafe.
    // Assuming the user is initiating a conversation, they should be allowed.
    // But listMessages should be restricted.
    // This logic needs refinement based on requirements.
    // For now, allow if they are involved.
  }

  private async isAgencyAdmin(agencyId: string, userId: string) {
    const membership = await this.prisma.agencyMember.findFirst({
      where: {
        agencyId,
        userId,
        role: { in: [AgencyMemberRole.OWNER, AgencyMemberRole.MANAGER] },
      },
      select: { id: true },
    });
    return !!membership;
  }

  async search(dto: SearchPropertiesDto) {
    const filters = this.normalizeSearchFilters(dto);
    const useRanking = !dto.sort || dto.sort === "RELEVANCE";

    // Build Where Clause
    const activeStatuses = dto.verifiedOnly
      ? [PropertyStatus.VERIFIED]
      : [
        PropertyStatus.VERIFIED,
        PropertyStatus.PENDING_VERIFY,
        PropertyStatus.PUBLISHED,
      ];

    const where: Prisma.PropertyWhereInput = {
      status: { in: activeStatuses },
      // Exact Filters
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.countryId ? { countryId: filters.countryId } : {}),
      ...(filters.provinceId ? { provinceId: filters.provinceId } : {}),
      ...(filters.cityId ? { cityId: filters.cityId } : {}),
      ...(filters.suburbId ? { suburbId: filters.suburbId } : {}),

      // Range Filters
      ...(filters.priceMin || filters.priceMax
        ? {
          price: {
            ...(filters.priceMin ? { gte: filters.priceMin } : {}),
            ...(filters.priceMax ? { lte: filters.priceMax } : {}),
          },
        }
        : {}),
      ...(filters.bedrooms ? { bedrooms: { gte: filters.bedrooms } } : {}),
      ...(filters.bathrooms ? { bathrooms: { gte: filters.bathrooms } } : {}),
      ...(filters.minFloorArea
        ? {
          OR: [
            { areaSqm: { gte: filters.minFloorArea } },
            {
              commercialFields: {
                path: ["floorAreaSqm"],
                gte: filters.minFloorArea,
              },
            },
          ],
        }
        : {}),

      // Boolean / Enum Filters
      ...(filters.furnished ? { furnished: filters.furnished } : {}),
      // Parking Filter (Commented out until schema verified)
      // ...(filters.parking !== undefined ? {
      //     OR: [
      //         { commercialFields: { path: ['parkingBays'], gt: 0 } },
      //         { parking: true }
      //     ]
      // } : {}),

      // JSON Array Filter (Amenities)
      ...(filters.amenities && filters.amenities.length > 0
        ? {
          amenities: { hasSome: filters.amenities },
        }
        : {}),

      // Geo Bounds
      ...(filters.bounds
        ? {
          lat: {
            gte: filters.bounds.southWest.lat,
            lte: filters.bounds.northEast.lat,
          },
          lng: {
            gte: filters.bounds.southWest.lng,
            lte: filters.bounds.northEast.lng,
          },
        }
        : {}),

      // --- SMART RANKING FILTERS ---
      // Verified Only Support
      ...(dto.verifiedOnly
        ? {
          OR: [
            { verificationLevel: "VERIFIED" },
            { verificationLevel: "TRUSTED" },
          ],
        }
        : {}),
    };

    // Pagination
    const limit = dto.limit || 20;
    const offset = ((dto.page || 1) - 1) * limit;

    // Fetch Strategy
    const fetchLimit = useRanking ? limit * 5 : limit;

    // Sort Strategy
    let orderBy: any = { createdAt: "desc" };
    if (dto.sort === "PRICE_ASC") orderBy = { price: "asc" };
    if (dto.sort === "PRICE_DESC") orderBy = { price: "desc" };
    if (dto.sort === "NEWEST") orderBy = { createdAt: "desc" };
    if (dto.sort === "TRUST_DESC") orderBy = { trustScore: "desc" };
    if (!Array.isArray(orderBy)) orderBy = [orderBy, { id: "desc" }];

    const [total, properties] = await Promise.all([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        include: {
          media: true,
          country: true,
          province: true,
          city: true,
          suburb: true,
          pendingGeo: true,
          propertyRatings: { select: { rating: true } },
          listingPayments: { where: { status: "PAID" } },
          featuredListing: true,
        },
        orderBy,
        take: fetchLimit,
        skip: offset,
      }),
    ]);

    let resultProperties: any[] = properties;

    if (useRanking && properties.length > 0) {
      const ranked = await this.ranking.rankListingsAsync(properties as any[], {
        query: dto.filters,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        type: filters.type,
        bedrooms: filters.bedrooms,
        bathrooms: filters.bathrooms,
      });
      const pagedRanked = ranked.slice(0, limit);
      resultProperties = pagedRanked.map((r) => {
        const p = r.property as any;
        p.rankingScore = r.score;
        p.rankingBreakdown = r.breakdown;
        return p;
      });
    }

    const attached = await this.attachLocationToMany(resultProperties);
    return {
      data: attached,
      meta: {
        total,
        page: dto.page || 1,
        lastPage: Math.ceil(total / limit),
        rankingApplied: useRanking,
      },
    };
  }

  private buildBoundsFromCenter(lat: number, lng: number, radiusKm: number) {
    const latDelta = radiusKm / 110.574;
    const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    return {
      southWest: { lat: lat - latDelta, lng: lng - lngDelta },
      northEast: { lat: lat + latDelta, lng: lng + lngDelta },
    };
  }

  async getTopAgentsNear(input: {
    lat: number;
    lng: number;
    radiusKm?: number;
    limit?: number;
    verifiedOnly?: boolean;
    intent?: ListingIntent;
  }) {
    const radiusKm = input.radiusKm ?? 40;
    const limit = input.limit ?? 6;
    const verifiedOnly = input.verifiedOnly ?? true;
    const bounds = this.buildBoundsFromCenter(input.lat, input.lng, radiusKm);

    const activeStatuses = verifiedOnly
      ? [PropertyStatus.VERIFIED]
      : [
        PropertyStatus.VERIFIED,
        PropertyStatus.PENDING_VERIFY,
        PropertyStatus.PUBLISHED,
      ];

    const listings = await this.prisma.property.findMany({
      where: {
        status: { in: activeStatuses },
        lat: {
          gte: bounds.southWest.lat,
          lte: bounds.northEast.lat,
        },
        lng: {
          gte: bounds.southWest.lng,
          lte: bounds.northEast.lng,
        },
        ...(input.intent ? { listingIntent: input.intent } : {}),
      },
      select: {
        assignedAgentId: true,
        agentOwnerId: true,
        trustScore: true,
        status: true,
      },
      take: 500,
    });

    const stats = new Map<
      string,
      { count: number; trustSum: number; verifiedCount: number }
    >();

    listings.forEach((listing) => {
      const agentId = listing.assignedAgentId ?? listing.agentOwnerId;
      if (!agentId) return;
      const current = stats.get(agentId) ?? {
        count: 0,
        trustSum: 0,
        verifiedCount: 0,
      };
      current.count += 1;
      current.trustSum += Number(listing.trustScore ?? 0);
      if (listing.status === PropertyStatus.VERIFIED) {
        current.verifiedCount += 1;
      }
      stats.set(agentId, current);
    });

    const agentIds = Array.from(stats.keys());
    if (agentIds.length === 0) {
      return [];
    }

    const agents = await this.prisma.user.findMany({
      where: {
        id: { in: agentIds },
        role: {
          in: [Role.AGENT, Role.COMPANY_AGENT, Role.INDEPENDENT_AGENT],
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        profilePhoto: true,
        trustScore: true,
        agentProfile: {
          select: { rating: true },
        },
      },
    });

    const ranked = agents
      .map((agent) => {
        const agentStats = stats.get(agent.id) ?? {
          count: 0,
          trustSum: 0,
          verifiedCount: 0,
        };
        const avgTrust =
          agentStats.count > 0 ? agentStats.trustSum / agentStats.count : 0;
        return {
          id: agent.id,
          name: agent.name ?? null,
          phone: agent.phone ?? null,
          trustScore: agent.trustScore ?? 0,
          rating: agent.agentProfile?.rating ?? 0,
          verifiedListingsCount: agentStats.verifiedCount,
          averageListingTrust: avgTrust,
          profilePhoto: agent.profilePhoto ?? null,
          score:
            (agent.agentProfile?.rating ?? 0) * 12 +
            agentStats.verifiedCount * 5 +
            avgTrust * 0.8,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest);

    return ranked;
  }

  async getTopAgenciesNear(input: {
    lat: number;
    lng: number;
    radiusKm?: number;
    limit?: number;
    verifiedOnly?: boolean;
    intent?: ListingIntent;
  }) {
    const radiusKm = input.radiusKm ?? 40;
    const limit = input.limit ?? 6;
    const verifiedOnly = input.verifiedOnly ?? true;
    const bounds = this.buildBoundsFromCenter(input.lat, input.lng, radiusKm);

    const activeStatuses = verifiedOnly
      ? [PropertyStatus.VERIFIED]
      : [
        PropertyStatus.VERIFIED,
        PropertyStatus.PENDING_VERIFY,
        PropertyStatus.PUBLISHED,
      ];

    const listings = await this.prisma.property.findMany({
      where: {
        status: { in: activeStatuses },
        lat: {
          gte: bounds.southWest.lat,
          lte: bounds.northEast.lat,
        },
        lng: {
          gte: bounds.southWest.lng,
          lte: bounds.northEast.lng,
        },
        agencyId: { not: null },
        ...(input.intent ? { listingIntent: input.intent } : {}),
      },
      select: {
        agencyId: true,
        trustScore: true,
        status: true,
      },
      take: 600,
    });

    const stats = new Map<
      string,
      { count: number; trustSum: number; verifiedCount: number }
    >();

    listings.forEach((listing) => {
      if (!listing.agencyId) return;
      const current = stats.get(listing.agencyId) ?? {
        count: 0,
        trustSum: 0,
        verifiedCount: 0,
      };
      current.count += 1;
      current.trustSum += Number(listing.trustScore ?? 0);
      if (listing.status === PropertyStatus.VERIFIED) {
        current.verifiedCount += 1;
      }
      stats.set(listing.agencyId, current);
    });

    const agencyIds = Array.from(stats.keys());
    if (agencyIds.length === 0) {
      return [];
    }

    const agencies = await this.prisma.agency.findMany({
      where: { id: { in: agencyIds } },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        trustScore: true,
        companyProfile: {
          select: { avgRating: true },
        },
      },
    });

    const ranked = agencies
      .map((agency) => {
        const agencyStats = stats.get(agency.id) ?? {
          count: 0,
          trustSum: 0,
          verifiedCount: 0,
        };
        const avgTrust =
          agencyStats.count > 0 ? agencyStats.trustSum / agencyStats.count : 0;
        return {
          id: agency.id,
          name: agency.name,
          logoUrl: agency.logoUrl ?? null,
          trustScore: agency.trustScore ?? 0,
          rating: agency.companyProfile?.avgRating ?? 0,
          verifiedListingsCount: agencyStats.verifiedCount,
          averageListingTrust: avgTrust,
          score:
            (agency.companyProfile?.avgRating ?? 0) * 12 +
            agencyStats.verifiedCount * 5 +
            avgTrust * 0.8,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest);

    return ranked;
  }

  async getHomeCounts(input: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }) {
    const hasCoords =
      typeof input.lat === "number" && typeof input.lng === "number";
    const bounds = hasCoords
      ? this.buildBoundsFromCenter(
        input.lat as number,
        input.lng as number,
        input.radiusKm ?? 40,
      )
      : null;
    const locationFilter = bounds
      ? {
        lat: {
          gte: bounds.southWest.lat,
          lte: bounds.northEast.lat,
        },
        lng: {
          gte: bounds.southWest.lng,
          lte: bounds.northEast.lng,
        },
      }
      : {};

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    const publicStatuses = [PropertyStatus.VERIFIED, PropertyStatus.PUBLISHED];
    const [verifiedListingsCount, newListings30dCount, trustChecksCount] =
      await Promise.all([
        this.prisma.property.count({
          where: {
            OR: [
              { status: PropertyStatus.VERIFIED },
              {
                status: PropertyStatus.PUBLISHED,
                verificationLevel: { in: [VerificationLevel.VERIFIED, VerificationLevel.TRUSTED] },
              },
              {
                status: PropertyStatus.PUBLISHED,
                verificationScore: { gte: 70 },
              },
            ],
            ...locationFilter,
          },
        }),
        this.prisma.property.count({
          where: {
            status: { in: publicStatuses },
            createdAt: { gte: sinceDate },
            ...locationFilter,
          },
        }),
        this.prisma.verificationRequestItem.count({
          where: { status: "APPROVED" },
        }),
      ]);

    let partnersCount = 0;
    if (bounds) {
      const listings = await this.prisma.property.findMany({
        where: {
          status: PropertyStatus.VERIFIED,
          ...locationFilter,
        },
        select: {
          assignedAgentId: true,
          agentOwnerId: true,
          agencyId: true,
        },
        take: 800,
      });
      const agentIds = new Set<string>();
      const agencyIds = new Set<string>();
      listings.forEach((listing) => {
        if (listing.assignedAgentId) agentIds.add(listing.assignedAgentId);
        if (listing.agentOwnerId) agentIds.add(listing.agentOwnerId);
        if (listing.agencyId) agencyIds.add(listing.agencyId);
      });
      partnersCount = agentIds.size + agencyIds.size;
    } else {
      const [agentsCount, agenciesCount] = await Promise.all([
        this.prisma.user.count({
          where: {
            role: {
              in: [Role.AGENT, Role.COMPANY_AGENT, Role.INDEPENDENT_AGENT],
            },
          },
        }),
        this.prisma.agency.count({
          where: { status: "ACTIVE" },
        }),
      ]);
      partnersCount = agentsCount + agenciesCount;
    }

    return {
      verifiedListingsCount,
      partnersCount,
      newListings30dCount,
      trustChecksCount,
    };
  }

  async getHomeAreas(input: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    city?: string;
    limitCities?: number;
    limitSuburbs?: number;
  }) {
    const limitCities = input.limitCities ?? 6;
    const limitSuburbs = input.limitSuburbs ?? 6;
    const hasCoords =
      typeof input.lat === "number" && typeof input.lng === "number";
    const bounds = hasCoords
      ? this.buildBoundsFromCenter(
        input.lat as number,
        input.lng as number,
        input.radiusKm ?? 40,
      )
      : null;
    const locationFilter = bounds
      ? {
        lat: {
          gte: bounds.southWest.lat,
          lte: bounds.northEast.lat,
        },
        lng: {
          gte: bounds.southWest.lng,
          lte: bounds.northEast.lng,
        },
      }
      : {};

    const publicStatuses = [PropertyStatus.VERIFIED, PropertyStatus.PUBLISHED];

    const topCities = await this.prisma.property.groupBy({
      by: ["cityId"],
      where: {
        status: { in: publicStatuses },
        cityId: { not: null },
        ...locationFilter,
      },
      _count: { cityId: true },
      orderBy: { _count: { cityId: "desc" } },
      take: limitCities,
    });

    const cityIds = topCities
      .map((item) => item.cityId)
      .filter(Boolean) as string[];
    const cities = cityIds.length
      ? await this.prisma.city.findMany({
        where: { id: { in: cityIds } },
        select: {
          id: true,
          name: true,
          lat: true,
          lng: true,
          province: { select: { name: true } },
        },
      })
      : [];

    const cityCounts = new Map<string, number>();
    topCities.forEach((item) => {
      if (item.cityId) cityCounts.set(item.cityId, item._count.cityId);
    });

    const cityResults = cities
      .map((city) => ({
        id: city.id,
        name: city.name,
        province: city.province?.name ?? null,
        lat: city.lat,
        lng: city.lng,
        count: cityCounts.get(city.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCities);

    let suburbFilter: any = locationFilter;
    if (input.city) {
      const cityRecord = await this.prisma.city.findFirst({
        where: { name: { equals: input.city, mode: "insensitive" } },
        select: { id: true },
      });
      if (cityRecord?.id) {
        suburbFilter = { ...suburbFilter, cityId: cityRecord.id };
      }
    }

    const topSuburbs = await this.prisma.property.groupBy({
      by: ["suburbId"],
      where: {
        status: { in: publicStatuses },
        suburbId: { not: null },
        ...suburbFilter,
      },
      _count: { suburbId: true },
      orderBy: { _count: { suburbId: "desc" } },
      take: limitSuburbs,
    });

    const suburbIds = topSuburbs
      .map((item) => item.suburbId)
      .filter(Boolean) as string[];
    const suburbs = suburbIds.length
      ? await this.prisma.suburb.findMany({
        where: { id: { in: suburbIds } },
        select: { id: true, name: true, city: { select: { name: true } } },
      })
      : [];

    const suburbCounts = new Map<string, number>();
    topSuburbs.forEach((item) => {
      if (item.suburbId) suburbCounts.set(item.suburbId, item._count.suburbId);
    });

    const suburbResults = suburbs
      .map((suburb) => ({
        id: suburb.id,
        name: suburb.name,
        city: suburb.city?.name ?? null,
        count: suburbCounts.get(suburb.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitSuburbs);

    return { cities: cityResults, suburbs: suburbResults };
  }

  async submitForVerification(
    id: string,
    dto: SubmitForVerificationDto,
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(property, actor);

    // Check if there's already a verification request
    const existingRequest = await this.prisma.verificationRequest.findFirst({
      where: {
        propertyId: id,
      },
      include: {
        items: true,
      },
    });

    // If REJECTED, we will "revive" it.
    // If PENDING/SUBMITTED/APPROVED, we will allow adding new items (e.g. upgrading level).
    // NO blocking check here.

    // Validate file limits per item
    if (dto.proofOfOwnershipUrls && dto.proofOfOwnershipUrls.length > 5) {
      throw new BadRequestException("Proof of Ownership allows max 5 files");
    }
    if (dto.propertyPhotoUrls && dto.propertyPhotoUrls.length > 5) {
      throw new BadRequestException("Property Photos allows max 5 files");
    }

    // Fetch verification costs config - values are in dollars (e.g., 5 = $5)
    const verificationCosts = (await this.pricing.getConfig(
      "pricing.verificationCosts",
      {
        PROOF_OF_OWNERSHIP: 5,
        LOCATION_CONFIRMATION: 5,
        PROPERTY_PHOTOS: 5,
        SITE_VISIT_UPGRADE: 15,
      },
    )) as Record<string, number>;

    // Calculate total fee based on submitted items
    // Convert dollars to cents for payment ledger
    let totalFeeUsd = 0;
    if (dto.proofOfOwnershipUrls && dto.proofOfOwnershipUrls.length > 0) {
      totalFeeUsd += verificationCosts["PROOF_OF_OWNERSHIP"] || 5;
    }
    if (
      dto.requestOnSiteVisit &&
      (!dto.locationGpsLat || !dto.locationGpsLng)
    ) {
      throw new BadRequestException(
        "Location GPS is required when requesting an on-site visit",
      );
    }

    if (dto.locationGpsLat && dto.locationGpsLng) {
      totalFeeUsd += verificationCosts["LOCATION_CONFIRMATION"] || 5;
      if (dto.requestOnSiteVisit) {
        totalFeeUsd += verificationCosts["SITE_VISIT_UPGRADE"] || 15;
      }
    }
    if (dto.propertyPhotoUrls && dto.propertyPhotoUrls.length > 0) {
      totalFeeUsd += verificationCosts["PROPERTY_PHOTOS"] || 5;
    }
    // Convert to cents for payment storage
    const verificationFeeUsdCents = totalFeeUsd * 100;

    let verificationRequest: any;

    if (existingRequest) {
      // Reuse existing request
      verificationRequest = existingRequest;

      // If strictly REJECTED, reset to PENDING to indicate activity (optional, but good for admin visibility)
      if (existingRequest.status === "REJECTED") {
        await this.prisma.verificationRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: "PENDING",
            notes: dto.notes ?? existingRequest.notes,
          }, // Reset to Pending
        });
      }

      // Handle Proof of Ownership Item
      const proofItem = existingRequest.items.find(
        (i: { type: string }) => i.type === "PROOF_OF_OWNERSHIP",
      );
      if (dto.proofOfOwnershipUrls && dto.proofOfOwnershipUrls.length > 0) {
        if (proofItem) {
          // Editability Window Check: Allow edit if < 6 hours since review OR if status is NOT Approved
          const hoursSinceReview = proofItem.reviewedAt
            ? differenceInHours(new Date(), proofItem.reviewedAt)
            : 0;
          const isEditable =
            proofItem.status !== "APPROVED" || hoursSinceReview < 6;

          if (isEditable) {
            // ... logic ...
            if (proofItem.status !== "APPROVED" || hoursSinceReview < 6) {
              await this.prisma.verificationRequestItem.update({
                where: { id: proofItem.id },
                data: {
                  status: "SUBMITTED",
                  evidenceUrls: dto.proofOfOwnershipUrls,
                  verifierId: null,
                  reviewedAt: null,
                },
              });
              // Fingerprint
              void this.fingerprintService.processItemEvidence(
                proofItem.id,
                dto.proofOfOwnershipUrls,
              );
            }
          }
        } else {
          // TODO: create new item if needed
          // const newItem = await this.prisma.verificationRequestItem.create({
          //   data: { ... }
          // });
        }
      }

      // Handle Location Item
      const locationItem = existingRequest.items.find(
        (i: { type: string }) => i.type === "LOCATION_CONFIRMATION",
      );
      if (
        dto.requestOnSiteVisit &&
        (!dto.locationGpsLat || !dto.locationGpsLng)
      ) {
        throw new BadRequestException(
          "Location GPS is required when requesting an on-site visit",
        );
      }

      if (dto.locationGpsLat && dto.locationGpsLng) {
        let updatedLocationItem;
        if (locationItem) {
          const hoursSinceReview = locationItem.reviewedAt
            ? differenceInHours(new Date(), locationItem.reviewedAt)
            : 0;
          const isUpgrade =
            dto.requestOnSiteVisit &&
            !locationItem.notes?.includes("On-site visit");
          const isEditable =
            locationItem.status !== "APPROVED" ||
            hoursSinceReview < 6 ||
            isUpgrade;

          if (isEditable) {
            updatedLocationItem =
              await this.prisma.verificationRequestItem.update({
                where: { id: locationItem.id },
                data: {
                  status: "SUBMITTED",
                  gpsLat: dto.locationGpsLat,
                  gpsLng: dto.locationGpsLng,
                  notes: dto.requestOnSiteVisit
                    ? "On-site visit requested"
                    : isUpgrade
                      ? "On-site visit requested"
                      : locationItem.notes,
                  verifierId: null,
                  reviewedAt: null,
                },
              });
          }
        } else {
          updatedLocationItem =
            await this.prisma.verificationRequestItem.create({
              data: {
                verificationRequestId: existingRequest.id,
                type: "LOCATION_CONFIRMATION",
                status: "SUBMITTED",
                gpsLat: dto.locationGpsLat,
                gpsLng: dto.locationGpsLng,
                notes: dto.requestOnSiteVisit
                  ? "On-site visit requested"
                  : null,
              },
            });
        }

        // PRODUCTION HARDENING: Auto-create SiteVisit when location item requests on-site visit
        if (updatedLocationItem && dto.requestOnSiteVisit) {
          // Check if site visit already exists for this item
          const existingSiteVisit = await this.prisma.siteVisit.findFirst({
            where: { verificationItemId: updatedLocationItem.id },
          });
          if (!existingSiteVisit) {
            await this.prisma.siteVisit.create({
              data: {
                propertyId: id,
                verificationItemId: updatedLocationItem.id,
                requestedByUserId: actor.userId,
                status: "PENDING_ASSIGNMENT",
                notes: "Auto-created from verification request",
              },
            });
          }
        }
      }

      // Handle Photos Item
      const photoItem = existingRequest.items.find(
        (i: { type: string }) => i.type === "PROPERTY_PHOTOS",
      );
      if (dto.propertyPhotoUrls && dto.propertyPhotoUrls.length > 0) {
        if (photoItem) {
          if (photoItem.status !== "APPROVED") {
            await this.prisma.verificationRequestItem.update({
              where: { id: photoItem.id },
              data: {
                status: "SUBMITTED",
                evidenceUrls: dto.propertyPhotoUrls,
                verifierId: null,
                reviewedAt: null,
              },
            });
            // Fingerprint (Async)
            void this.fingerprintService.processItemEvidence(
              photoItem.id,
              dto.propertyPhotoUrls,
            );
          }
        } else {
          const newItem = await this.prisma.verificationRequestItem.create({
            data: {
              verificationRequestId: existingRequest.id,
              type: "PROPERTY_PHOTOS",
              status: "SUBMITTED",
              evidenceUrls: dto.propertyPhotoUrls,
            },
          });
          // Fingerprint (Async)
          void this.fingerprintService.processItemEvidence(
            newItem.id,
            dto.propertyPhotoUrls,
          );
        }
      }

      // Reload request and validate at least one item is SUBMITTED
      verificationRequest = await this.prisma.verificationRequest.findUnique({
        where: { id: existingRequest.id },
        include: { items: true },
      });

      // Validate that at least one item has SUBMITTED status
      const submittedItemsCount = verificationRequest.items.filter(
        (i: any) => i.status === "SUBMITTED",
      ).length;
      if (submittedItemsCount === 0) {
        throw new BadRequestException(
          "At least one verification item must be SUBMITTED. Please provide evidence for at least one item (proof of ownership, location GPS, or property photos).",
        );
      }
    } else {
      // NEW Request Logic
      // MANDATORY: Create VerificationRequest with targetType='PROPERTY' and at least one SUBMITTED item

      // Validate that at least one item will be SUBMITTED
      const hasProofOfOwnership =
        dto.proofOfOwnershipUrls && dto.proofOfOwnershipUrls.length > 0;
      const hasLocation = dto.locationGpsLat && dto.locationGpsLng;
      const hasPropertyPhotos =
        dto.propertyPhotoUrls && dto.propertyPhotoUrls.length > 0;

      if (!hasProofOfOwnership && !hasLocation && !hasPropertyPhotos) {
        throw new BadRequestException(
          "At least one verification item with evidence must be provided (proof of ownership, location GPS, or property photos)",
        );
      }

      verificationRequest = await this.prisma.verificationRequest.create({
        data: {
          targetType: "PROPERTY",
          targetId: id,
          propertyId: id,
          requesterId: actor.userId,
          status: "PENDING",
          notes: dto.notes ?? null,
          items: {
            create: [
              ...(hasProofOfOwnership
                ? [
                  {
                    type: "PROOF_OF_OWNERSHIP" as const,
                    status: "SUBMITTED" as const,
                    evidenceUrls: dto.proofOfOwnershipUrls!,
                  },
                ]
                : [
                  {
                    type: "PROOF_OF_OWNERSHIP" as const,
                    status: "PENDING" as const,
                  },
                ]),
              {
                type: "LOCATION_CONFIRMATION" as const,
                status: hasLocation
                  ? ("SUBMITTED" as const)
                  : ("PENDING" as const),
                gpsLat: dto.locationGpsLat ?? null,
                gpsLng: dto.locationGpsLng ?? null,
                notes: dto.requestOnSiteVisit
                  ? "On-site visit requested"
                  : null,
              },
              ...(hasPropertyPhotos
                ? [
                  {
                    type: "PROPERTY_PHOTOS" as const,
                    status: "SUBMITTED" as const,
                    evidenceUrls: dto.propertyPhotoUrls!,
                  },
                ]
                : [
                  {
                    type: "PROPERTY_PHOTOS" as const,
                    status: "PENDING" as const,
                  },
                ]),
            ],
          },
        },
        include: {
          items: true,
        },
      });

      // Validate that at least one item was created with SUBMITTED status
      const submittedItemsCount = verificationRequest.items.filter(
        (i: any) => i.status === "SUBMITTED",
      ).length;
      if (submittedItemsCount === 0) {
        // This should not happen due to validation above, but double-check
        await this.prisma.verificationRequest.delete({
          where: { id: verificationRequest.id },
        });
        throw new BadRequestException(
          "Failed to create verification request: at least one item must be SUBMITTED",
        );
      }

      // Post-Creation Fingerprinting
      for (const item of verificationRequest.items) {
        if (item.evidenceUrls && item.evidenceUrls.length > 0) {
          void this.fingerprintService.processItemEvidence(
            item.id,
            item.evidenceUrls,
          );
        }
      }

      // PRODUCTION HARDENING: Auto-create SiteVisit when location item requests on-site visit
      const locationItem = verificationRequest.items.find(
        (i: any) =>
          i.type === "LOCATION_CONFIRMATION" &&
          i.notes?.includes("On-site visit requested"),
      );
      if (locationItem && dto.requestOnSiteVisit) {
        await this.prisma.siteVisit.create({
          data: {
            propertyId: id,
            verificationItemId: locationItem.id,
            requestedByUserId: actor.userId,
            status: "PENDING_ASSIGNMENT",
            notes: "Auto-created from verification request",
          },
        });
      }
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
            verificationFee: true,
          },
        },
      });
    }

    // Update property status
    // Do not update property status. Verification state is derived from VerificationRequest.
    // const updated = await this.prisma.property.update({ ... });

    await this.audit.logAction({
      action: "property.submitForVerification",
      actorId: actor.userId,
      targetType: "property",
      targetId: id,
      metadata: {
        verificationRequestId: verificationRequest.id,
        paymentId: payment?.id ?? null,
        itemsSubmitted: verificationRequest.items.filter(
          (i: { status: string }) => i.status === "SUBMITTED",
        ).length,
      },
    });

    // Log activity
    await this.logActivity(
      id,
      ListingActivityType.VERIFICATION_SUBMITTED,
      actor.userId,
      {
        verificationRequestId: verificationRequest.id,
      },
    );

    return {
      property: this.attachLocation(property),
      verificationRequest,
      payment,
    };
  }

  async getVerificationRequest(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify access
    const isAuthorized =
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId ||
      actor.role === Role.ADMIN;
    if (!isAuthorized) {
      throw new ForbiddenException(
        "You do not have permission to view verification requests for this property",
      );
    }

    const request = await this.prisma.verificationRequest.findFirst({
      where: { propertyId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            verificationScore: true,
            verificationLevel: true,
          },
        },
        items: {
          include: {
            verifier: {
              select: { id: true, name: true },
            },
            siteVisits: {
              include: {
                assignedModerator: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { type: "asc" },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return request;
  }

  async updateVerificationItem(
    propertyId: string,
    itemId: string,
    dto: {
      evidenceUrls?: string[];
      gpsLat?: number;
      gpsLng?: number;
      notes?: string;
      requestOnSiteVisit?: boolean;
    },
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureCanMutate(property, actor);

    const item = await this.prisma.verificationRequestItem.findUnique({
      where: { id: itemId },
      include: {
        verificationRequest: {
          select: { propertyId: true, requesterId: true, id: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Verification item not found");
    }

    if (item.verificationRequest.propertyId !== propertyId) {
      throw new BadRequestException(
        "Verification item does not belong to this property",
      );
    }

    if (item.verificationRequest.requesterId !== actor.userId) {
      throw new ForbiddenException(
        "Only the requester can update verification items",
      );
    }

    if (item.status === "APPROVED") {
      throw new BadRequestException(
        "Cannot update an item that has been approved",
      );
    }

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (item.status === "SUBMITTED" && item.updatedAt < thirtyMinsAgo) {
      throw new BadRequestException(
        "Verification item is locked for review (30-minute edit window expired)",
      );
    }

    // Validate single file upload (now max 5)
    if (dto.evidenceUrls && dto.evidenceUrls.length > 5) {
      if (item.type === "PROOF_OF_OWNERSHIP") {
        throw new BadRequestException("Proof of Ownership allows max 5 files");
      }
      if (item.type === "PROPERTY_PHOTOS") {
        throw new BadRequestException("Property Photos allows max 5 files");
      }
    }

    const resolvedGpsLat = dto.gpsLat ?? item.gpsLat;
    const resolvedGpsLng = dto.gpsLng ?? item.gpsLng;

    let notes = dto.notes ?? item.notes;
    if (dto.requestOnSiteVisit) {
      if (!resolvedGpsLat || !resolvedGpsLng) {
        throw new BadRequestException(
          "Location GPS is required when requesting an on-site visit",
        );
      }
      const visitNote = "On-site visit requested";
      if (!notes) {
        notes = visitNote;
      } else if (!notes.includes(visitNote)) {
        notes = `${notes}\n${visitNote}`;
      }
    }

    // Auto-transition to SUBMITTED logic
    let newStatus = item.status;
    const hasEvidence = dto.evidenceUrls && dto.evidenceUrls.length > 0;
    const hasLocation =
      (resolvedGpsLat !== undefined && resolvedGpsLng !== undefined) ||
      dto.requestOnSiteVisit;

    if (item.status === "PENDING" || item.status === "REJECTED") {
      if (hasEvidence || hasLocation) {
        newStatus = "SUBMITTED";
      }
    } else if (item.status === "SUBMITTED") {
      // Keep as SUBMITTED (editing window)
      newStatus = "SUBMITTED";
    }

    // If updating usage of REJECTED item was successful, ensure parent request is also revived if it was rejected
    if (item.status === "REJECTED" && newStatus === "SUBMITTED") {
      const parentRequest = await this.prisma.verificationRequest.findUnique({
        where: { id: item.verificationRequest.id },
      });
      if (parentRequest && parentRequest.status === "REJECTED") {
        await this.prisma.verificationRequest.update({
          where: { id: parentRequest.id },
          data: { status: "PENDING" },
        });
      }
    }

    const updatedItem = await this.prisma.verificationRequestItem.update({
      where: { id: itemId },
      data: {
        evidenceUrls: dto.evidenceUrls ?? item.evidenceUrls,
        gpsLat: resolvedGpsLat,
        gpsLng: resolvedGpsLng,
        notes: notes,
        status: newStatus,
        verifierId: newStatus === "SUBMITTED" ? null : item.verifierId, // Reset verifier on resubmit
        reviewedAt: newStatus === "SUBMITTED" ? null : item.reviewedAt,
      },
    });

    if (dto.requestOnSiteVisit && item.type === "LOCATION_CONFIRMATION") {
      const existingSiteVisit = await this.prisma.siteVisit.findFirst({
        where: { verificationItemId: itemId },
      });
      if (!existingSiteVisit) {
        await this.prisma.siteVisit.create({
          data: {
            propertyId,
            verificationItemId: itemId,
            requestedByUserId: actor.userId,
            status: "PENDING_ASSIGNMENT",
            notes: "Auto-created from verification update",
          },
        });
      }
    }

    // Create payment record when item is newly submitted
    if (newStatus === "SUBMITTED" && item.status !== "SUBMITTED") {
      // Check if a verification payment already exists for this item type
      const existingPayment = await this.prisma.listingPayment.findFirst({
        where: {
          propertyId,
          type: ListingPaymentType.VERIFICATION,
          metadata: {
            path: ["itemType"],
            equals: item.type,
          },
        },
      });

      if (!existingPayment) {
        // Fetch verification costs
        const verificationCosts = (await this.pricing.getConfig(
          "pricing.verificationCosts",
          {
            PROOF_OF_OWNERSHIP: 5,
            LOCATION_CONFIRMATION: 5,
            PROPERTY_PHOTOS: 5,
            SITE_VISIT_UPGRADE: 15,
          },
        )) as Record<string, number>;

        // Determine the fee for this item type
        let feeUsd = verificationCosts[item.type] || 5;
        if (dto.requestOnSiteVisit && item.type === "LOCATION_CONFIRMATION") {
          feeUsd += verificationCosts["SITE_VISIT_UPGRADE"] || 15;
        }

        const feeCents = feeUsd * 100;

        // Create a PENDING payment record
        await this.prisma.listingPayment.create({
          data: {
            propertyId,
            type: ListingPaymentType.VERIFICATION,
            amountCents: feeCents,
            currency: Currency.USD,
            status: ListingPaymentStatus.PENDING,
            reference: `VERIFICATION_${item.type}_${propertyId}_${Date.now()}`,
            metadata: {
              itemType: item.type,
              itemId: itemId,
              verificationFee: true,
            },
          },
        });
      }
    }

    await this.audit.logAction({
      action: "verification.item.update",
      actorId: actor.userId,
      targetType: "verificationRequestItem",
      targetId: itemId,
      metadata: { propertyId, itemType: item.type, newStatus },
    });

    return updatedItem;
  }

  async reviewVerificationItem(
    propertyId: string,
    itemId: string,
    dto: { status: string; notes?: string },
    actor: AuthContext,
  ) {
    // Only admins can review verification items
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Only administrators can review verification items",
      );
    }

    const property = await this.getPropertyOrThrow(propertyId);
    const item = await this.prisma.verificationRequestItem.findUnique({
      where: { id: itemId },
      include: {
        verificationRequest: {
          select: { propertyId: true, id: true },
        },
      },
    });

    if (!item) {
      throw new NotFoundException("Verification item not found");
    }

    if (item.verificationRequest.propertyId !== propertyId) {
      throw new BadRequestException(
        "Verification item does not belong to this property",
      );
    }

    const updated = await this.prisma.verificationRequestItem.update({
      where: { id: itemId },
      data: {
        status: dto.status as VerificationItemStatus,
        notes: dto.notes ?? item.notes,
        verifierId: actor.userId,
        reviewedAt: new Date(),
      },
    });

    // Write off pending verification payment if Admin approves before payment
    if (dto.status === "APPROVED") {
      const pendingPayment = await this.prisma.listingPayment.findFirst({
        where: {
          propertyId,
          type: ListingPaymentType.VERIFICATION,
          status: ListingPaymentStatus.PENDING,
          metadata: {
            path: ["itemType"],
            equals: item.type,
          },
        },
      });

      if (pendingPayment) {
        // Write off the payment as waived
        await this.prisma.listingPayment.update({
          where: { id: pendingPayment.id },
          data: {
            status: ListingPaymentStatus.CANCELLED,
            metadata: {
              ...((pendingPayment.metadata as Record<string, unknown>) || {}),
              waivedByAdmin: true,
              waivedAt: new Date().toISOString(),
              waivedReason: "Admin approved verification before payment",
              discountPercent: 100,
            },
          },
        });
      }
    }

    // Check if all items are reviewed and update request status
    const allItems = await this.prisma.verificationRequestItem.findMany({
      where: { verificationRequestId: item.verificationRequest.id },
    });

    const allApproved = allItems.every(
      (i: { status: string }) => i.status === "APPROVED",
    );
    const anyRejected = allItems.some(
      (i: { status: string }) => i.status === "REJECTED",
    );

    if (allApproved) {
      await this.prisma.verificationRequest.update({
        where: { id: item.verificationRequest.id },
        data: { status: VerificationStatus.APPROVED },
      });

      // Update property status to VERIFIED
      await this.prisma.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      });
    } else if (anyRejected) {
      await this.prisma.verificationRequest.update({
        where: { id: item.verificationRequest.id },
        data: { status: VerificationStatus.REJECTED },
      });
    }

    await this.audit.logAction({
      action: "verification.item.review",
      actorId: actor.userId,
      targetType: "verificationRequestItem",
      targetId: itemId,
      metadata: { propertyId, status: dto.status },
    });

    // Log activity
    const activityType =
      dto.status === "APPROVED"
        ? ListingActivityType.VERIFICATION_APPROVED
        : ListingActivityType.VERIFICATION_REJECTED;
    await this.logActivity(propertyId, activityType, actor.userId, {
      verificationRequestId: item.verificationRequest.id,
      itemType: item.type,
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
          lte: northLat,
        },
        lng: {
          gte: westLng,
          lte: eastLng,
        },
        ...(dto.type ? { type: dto.type as any } : {}),
      },
      include: {
        media: { take: 3 },
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true,
      },
    });

    return this.attachLocationToMany(properties);
  }

  async listFeatured(input?: { lat?: number; lng?: number; radiusKm?: number }) {
    const now = new Date();
    const hasLocation =
      typeof input?.lat === "number" && typeof input?.lng === "number";

    // 1. Fetch ALL active featured listings (usually small number < 100)
    const featuredProperties: Prisma.PropertyGetPayload<{
      include: {
        media: true;
        city: true;
        suburb: true;
        featuredListing: true;
      };
    }>[] = await this.prisma.property.findMany({
      where: {
        status: {
          in: [
            PropertyStatus.VERIFIED,
            PropertyStatus.PENDING_VERIFY,
            PropertyStatus.PUBLISHED,
          ],
        },
        featuredListing: {
          status: "ACTIVE",
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
      },
      include: {
        media: { take: 1 },
        city: true,
        suburb: true,
        featuredListing: true,
      },
      // Initial sort by priority so slice works better if limits were applied
      orderBy: [
        { featuredListing: { priorityLevel: "desc" } },
        { featuredListing: { startsAt: "desc" } },
      ],
      take: 50, // Limit to reasonable number of featured items
    });

    // 2. Sort in memory based on priority AND distance if location provided
    const sortedFeatured = [...featuredProperties].sort((a, b) => {
      // Primary Sort: Priority Level (Platinum vs Gold)
      const aPriority =
        (a.featuredListing?.priorityLevel ?? 0) + (a.featuredListing ? 100 : 0);
      const bPriority =
        (b.featuredListing?.priorityLevel ?? 0) + (b.featuredListing ? 100 : 0);

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Secondary Sort: Distance (if user provided location)
      if (hasLocation) {
        // Simple distance check if both have coords
        if (a.lat && a.lng && b.lat && b.lng) {
          const distA = Math.sqrt(
            Math.pow((a.lat - (input?.lat ?? 0)), 2) +
            Math.pow((a.lng - (input?.lng ?? 0)), 2)
          );
          const distB = Math.sqrt(
            Math.pow((b.lat - (input?.lat ?? 0)), 2) +
            Math.pow((b.lng - (input?.lng ?? 0)), 2)
          );
          // If difference is significant (> 0.01 deg ~= 1km), sort by distance
          if (Math.abs(distA - distB) > 0.0001) {
            return distA - distB;
          }
        } else if (a.lat && a.lng) {
          return -1; // a has location, prioritize
        } else if (b.lat && b.lng) {
          return 1; // b has location, prioritize
        }
      }

      // Tertiary Sort: Start Date (Newest first)
      const aStartsAt = a.featuredListing?.startsAt?.getTime?.() ?? 0;
      const bStartsAt = b.featuredListing?.startsAt?.getTime?.() ?? 0;
      return bStartsAt - aStartsAt;
    });

    // Take top 12
    const topFeatured = sortedFeatured.slice(0, 12);

    const remainingSlots = Math.max(0, 12 - topFeatured.length);
    const fallbackProperties = remainingSlots
      ? await this.prisma.property.findMany({
        where: {
          status: {
            in: [
              PropertyStatus.VERIFIED,
              PropertyStatus.PENDING_VERIFY,
              PropertyStatus.PUBLISHED,
            ],
          },
          id: topFeatured.length
            ? { notIn: topFeatured.map((property) => property.id) }
            : undefined,
          // Only Verified/Trusted if filling slots
          OR: [
            { verificationLevel: { in: [VerificationLevel.VERIFIED, VerificationLevel.TRUSTED] } },
            { verificationScore: { gte: 70 } }
          ]
        },
        include: {
          media: { take: 1 },
          city: true,
          suburb: true,
          featuredListing: true,
        },
        orderBy: [{ verificationScore: "desc" }, { updatedAt: "desc" }],
        take: remainingSlots,
      })
      : [];

    const finalProperties = [...topFeatured, ...fallbackProperties];

    const sorted = [...finalProperties].sort((a, b) => {
      // 1. Priority Level
      const aPriority =
        (a.featuredListing?.priorityLevel ?? 0) + (a.featuredListing ? 100 : 0);
      const bPriority =
        (b.featuredListing?.priorityLevel ?? 0) + (b.featuredListing ? 100 : 0);
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // 2. Distance (if location provided)
      if (hasLocation) {
        if (a.lat && a.lng && b.lat && b.lng) {
          const distA = Math.sqrt(
            Math.pow((a.lat - (input?.lat ?? 0)), 2) +
            Math.pow((a.lng - (input?.lng ?? 0)), 2)
          );
          const distB = Math.sqrt(
            Math.pow((b.lat - (input?.lat ?? 0)), 2) +
            Math.pow((b.lng - (input?.lng ?? 0)), 2)
          );
          if (Math.abs(distA - distB) > 0.0001) {
            return distA - distB;
          }
        }
      }

      // 3. Verification Level
      const verificationWeight = (property: typeof a) => {
        if (property.status === PropertyStatus.PENDING_VERIFY) {
          return 0;
        }
        if (property.verificationLevel === "VERIFIED") {
          return 3;
        }
        if (property.verificationLevel === "TRUSTED") {
          return 2;
        }
        if (property.verificationLevel === "BASIC") {
          return 1;
        }
        return 0;
      };

      const aWeight = verificationWeight(a);
      const bWeight = verificationWeight(b);
      if (aWeight !== bWeight) {
        return bWeight - aWeight;
      }

      // 4. Start Date / Recency
      const aStartsAt = a.featuredListing?.startsAt?.getTime?.() ?? 0;
      const bStartsAt = b.featuredListing?.startsAt?.getTime?.() ?? 0;
      return bStartsAt - aStartsAt;
    });

    return sorted.map((property) => ({
      id: property.id,
      title: property.title,
      price: property.price,
      currency: property.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      areaSqm: property.areaSqm,
      lat: property.lat,
      lng: property.lng,
      listingIntent: property.listingIntent,
      status: property.status,
      verificationLevel: property.verificationLevel,
      verificationScore: property.verificationScore,
      isFeatured: Boolean(property.featuredListing),
      media: property.media,
      city: property.city,
      suburb: property.suburb,
    }));
  }

  async createSignedUpload(dto: CreateSignedUploadDto, actor: AuthContext) {
    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException("Unsupported file type");
    }

    const extension = extname(dto.fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException("Unsupported file extension");
    }

    if (dto.propertyId) {
      const property = await this.getPropertyOrThrow(dto.propertyId);
      this.ensureCanMutate(property, actor);
    }

    const key = `properties/${dto.propertyId ?? "drafts"}/${randomUUID()}${extension}`;
    const expires = Math.floor(Date.now() / 1000) + 900;
    const payload = `${key}:${dto.mimeType}:${expires}`;
    const signature = createHmac("sha256", env.S3_SECRET_KEY)
      .update(payload)
      .digest("hex");

    return {
      key,
      uploadUrl: `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}?expires=${expires}&signature=${signature}`,
      method: "PUT",
      headers: {
        "Content-Type": dto.mimeType,
        "x-upload-signature": signature,
        "x-upload-expires": expires.toString(),
      },
      expiresAt: new Date(expires * 1000),
    };
  }

  /**
   * Local image upload - stores files on disk and saves reference in database.
   * This is a fallback for when S3/R2 is not available.
   */
  async uploadLocalMedia(
    propertyId: string,
    file: { filename: string; mimetype: string; buffer: Buffer },
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureCanMutate(property, actor);

    const uploadsRoot = this.resolveUploadsRoot();

    // Create uploads directory if it doesn't exist
    const uploadsDir = resolve(uploadsRoot, "properties", propertyId);
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const extension = extname(file.filename).toLowerCase();
    const uniqueName = `${randomUUID()}${extension}`;
    const filePath = join(uploadsDir, uniqueName);

    // Write file to disk
    await writeFile(filePath, file.buffer as unknown as Uint8Array);

    // Determine media kind
    const kind = file.mimetype.startsWith("video/") ? "VIDEO" : "IMAGE";

    // Save reference in database
    const media = await this.prisma.propertyMedia.create({
      data: {
        propertyId,
        url: `/uploads/properties/${propertyId}/${uniqueName}`,
        kind,
        hasGps: false,
      },
    });

    await this.audit.logAction({
      action: "property.uploadMedia",
      actorId: actor.userId,
      targetType: "property",
      targetId: propertyId,
      metadata: { mediaId: media.id, filename: file.filename },
    });

    return media;
  }

  async linkMedia(
    propertyId: string,
    dto: { url: string; kind?: "IMAGE" | "VIDEO" },
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureCanMutate(property, actor);

    const url = dto.url.trim();
    const inferredKind = /\.(mp4|m4v|mov|webm)(\?|#|$)/i.test(url)
      ? "VIDEO"
      : "IMAGE";
    const kind = dto.kind ?? inferredKind;

    const media = await this.prisma.propertyMedia.create({
      data: {
        propertyId,
        url,
        kind,
        hasGps: false,
      },
    });

    await this.audit.logAction({
      action: "property.linkMedia",
      actorId: actor.userId,
      targetType: "property",
      targetId: propertyId,
      metadata: { mediaId: media.id, url },
    });

    return media;
  }

  async listMedia(propertyId: string) {
    return this.prisma.propertyMedia.findMany({
      where: { propertyId },
      orderBy: { id: "asc" },
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
        updatedAt: { lte: thirtyDaysAgo },
      },
      include: {
        property: {
          select: {
            id: true,
            dealConfirmedAt: true,
          },
        },
      },
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
            data: { status: InterestStatus.CONFIRMED },
          });

          // Reject all other offers on this property
          await tx.interest.updateMany({
            where: {
              propertyId: offer.propertyId,
              id: { not: offer.id },
              status: { not: InterestStatus.CONFIRMED },
            },
            data: { status: InterestStatus.REJECTED },
          });

          // Mark property as confirmed
          await tx.property.update({
            where: { id: offer.propertyId },
            data: {
              dealConfirmedAt: new Date(),
              dealConfirmedById: null, // System auto-confirmation
            },
          });
        });

        this.logger.log(
          `Auto-confirmed offer ${offer.id} for property ${offer.propertyId}`,
        );
      } catch (error) {
        this.logger.error(`Failed to auto-confirm offer ${offer.id}:`, error);
      }
    }
  }

  async deleteMedia(propertyId: string, mediaId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureCanMutate(property, actor);

    const media = await this.prisma.propertyMedia.findFirst({
      where: { id: mediaId, propertyId },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    // Try to delete local file if it's a local upload
    if (
      media.url.startsWith("/uploads/") ||
      media.url.startsWith("/v1/uploads/")
    ) {
      try {
        const uploadsRoot = this.resolveUploadsRoot();
        const relativePath = media.url
          .replace(/^\/v1\/uploads\//, "")
          .replace(/^\/uploads\//, "");
        const filePath = resolve(uploadsRoot, relativePath);
        await unlink(filePath);
      } catch (error) {
        // File may not exist, continue with database deletion
      }
    }

    await this.prisma.propertyMedia.delete({ where: { id: mediaId } });

    await this.audit.logAction({
      action: "property.deleteMedia",
      actorId: actor.userId,
      targetType: "property",
      targetId: propertyId,
      metadata: { mediaId },
    });

    return { success: true };
  }

  async scheduleViewing(
    propertyId: string,
    dto: {
      scheduledAt: string;
      notes?: string;
      locationLat?: number;
      locationLng?: number;
    },
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify user has an accepted or confirmed offer
    const interest = await this.prisma.interest.findFirst({
      where: {
        propertyId,
        userId: actor.userId,
        status: { in: [InterestStatus.ACCEPTED, InterestStatus.CONFIRMED] },
      },
    });

    if (!interest) {
      throw new ForbiddenException(
        "You must have an accepted or confirmed offer to schedule a viewing",
      );
    }

    const viewing = await this.prisma.viewing.create({
      data: {
        propertyId,
        viewerId: actor.userId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes ?? null,
        locationLat: dto.locationLat ?? null,
        locationLng: dto.locationLng ?? null,
        status: "PENDING",
        statusV2: "REQUESTED",
        requestedAt: new Date(),
        landlordId: property.landlordId,
        agentId: property.agentOwnerId,
      },
      include: {
        viewer: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
        landlord: { select: { id: true, name: true } },
      },
    });

    // TODO: Trigger email notification
    // TODO: Trigger WhatsApp/SMS notification

    await this.audit.logAction({
      action: "viewing.schedule",
      actorId: actor.userId,
      targetType: "viewing",
      targetId: viewing.id,
      metadata: { propertyId, scheduledAt: dto.scheduledAt },
    });

    // Log activity
    await this.logActivity(
      propertyId,
      ListingActivityType.VIEWING_SCHEDULED,
      actor.userId,
      {
        viewingId: viewing.id,
        scheduledAt: dto.scheduledAt,
      },
    );

    return viewing;
  }

  async createRentPayment(
    propertyId: string,
    dto: { amount: number; currency: string; paidAt: Date; proofUrl?: string },
    actor: AuthContext,
  ) {
    await this.getPropertyOrThrow(propertyId);

    return this.prisma.rentPayment.create({
      data: {
        propertyId,
        tenantId: actor.userId,
        amount: dto.amount,
        currency: dto.currency as any,
        paidAt: dto.paidAt,
        proofUrl: dto.proofUrl || null,
      },
    });
  }

  async respondToViewing(
    viewingId: string,
    dto: { status: string; notes?: string },
    actor: AuthContext,
  ) {
    const viewing = await this.prisma.viewing.findUnique({
      where: { id: viewingId },
      include: {
        property: {
          select: {
            id: true,
            landlordId: true,
            agentOwnerId: true,
          },
        },
      },
    });

    if (!viewing) {
      throw new NotFoundException("Viewing not found");
    }

    // Verify actor is landlord or agent
    const isAuthorized =
      viewing.property.landlordId === actor.userId ||
      viewing.property.agentOwnerId === actor.userId ||
      (viewing.property as any).assignedAgentId === actor.userId;
    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only the property owner or assigned agent can respond to viewings",
      );
    }

    const updated = await this.prisma.viewing.update({
      where: { id: viewingId },
      data: {
        status: dto.status as any,
        notes: dto.notes ?? viewing.notes,
        statusV2:
          dto.status === "ACCEPTED"
            ? "ACCEPTED"
            : dto.status === "POSTPONED"
              ? "RESCHEDULED"
              : dto.status === "CANCELLED"
                ? "CANCELLED"
                : dto.status === "COMPLETED"
                  ? "COMPLETED"
                  : undefined,
        acceptedAt: dto.status === "ACCEPTED" ? new Date() : undefined,
        rescheduledAt: dto.status === "POSTPONED" ? new Date() : undefined,
        cancelledAt: dto.status === "CANCELLED" ? new Date() : undefined,
        completedAt: dto.status === "COMPLETED" ? new Date() : undefined,
      },
      include: {
        viewer: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
        landlord: { select: { id: true, name: true } },
      },
    });

    // TODO: Trigger email notification
    // TODO: Trigger WhatsApp/SMS notification

    await this.audit.logAction({
      action: "viewing.respond",
      actorId: actor.userId,
      targetType: "viewing",
      targetId: viewingId,
      metadata: { status: dto.status },
    });

    // Log activity
    let activityType: ListingActivityType;
    if (dto.status === "ACCEPTED") {
      activityType = ListingActivityType.VIEWING_ACCEPTED;
    } else if (dto.status === "POSTPONED") {
      activityType = ListingActivityType.VIEWING_POSTPONED;
    } else if (dto.status === "CANCELLED") {
      activityType = ListingActivityType.VIEWING_CANCELLED;
    } else {
      return updated; // Unknown status, skip logging
    }
    await this.logActivity(viewing.property.id, activityType, actor.userId, {
      viewingId,
      status: dto.status,
    });

    return updated;
  }

  async listPayments(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify actor is landlord or agent
    const isAuthorized =
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId ||
      (property as any).assignedAgentId === actor.userId;
    if (!isAuthorized && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Only the property owner or assigned agent can view payments",
      );
    }

    const payments = await this.prisma.listingPayment.findMany({
      where: { propertyId },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            currency: true,
            pdfUrl: true,
            paymentIntents: {
              select: {
                id: true,
                redirectUrl: true,
                status: true,
                gateway: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return payments;
  }

  async createOfflineListingPayment(
    propertyId: string,
    payload: {
      type: ListingPaymentType;
      amount: number;
      currency: string;
      method: string;
      reference?: string | null;
      proofUrl?: string | null;
      notes?: string | null;
      paidAt?: Date | string;
    },
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureLandlordAccess(property, actor);

    const amountCents = Math.round(payload.amount * 100);
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException("Amount must be greater than zero");
    }

    const payment = await this.prisma.listingPayment.create({
      data: {
        propertyId,
        type: payload.type,
        amountCents,
        currency: payload.currency as Currency,
        status: ListingPaymentStatus.PENDING,
        reference: payload.reference ?? null,
        metadata: {
          method: payload.method,
          notes: payload.notes ?? null,
          proofUrl: payload.proofUrl ?? null,
          paidAt: payload.paidAt ?? null,
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            currency: true,
            pdfUrl: true,
          },
        },
      },
    });

    await this.audit.logAction({
      action: "property.offlinePayment",
      actorId: actor.userId,
      targetType: "property",
      targetId: propertyId,
      metadata: {
        paymentId: payment.id,
        amountCents,
        currency: payload.currency,
        method: payload.method,
      },
    });

    return payment;
  }

  async approveOfflineListingPayment(
    propertyId: string,
    paymentId: string,
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);

    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException("Only admins can approve offline payments");
    }

    const payment = await this.prisma.listingPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.propertyId !== propertyId) {
      throw new BadRequestException("Payment does not belong to this property");
    }

    if (payment.status === ListingPaymentStatus.PAID) {
      return payment;
    }

    const updated = await this.prisma.listingPayment.update({
      where: { id: paymentId },
      data: { status: ListingPaymentStatus.PAID },
    });

    await this.audit.logAction({
      action: "property.approvePayment",
      actorId: actor.userId,
      targetType: "property",
      targetId: propertyId,
      metadata: {
        paymentId: payment.id,
        amountCents: payment.amountCents,
        type: payment.type,
      },
    });

    return updated;
  }

  async createListingPaymentInvoice(
    propertyId: string,
    payload: {
      type: ListingPaymentType;
      amount: number;
      currency?: Currency;
      description?: string;
      purpose?: "OTHER" | "VERIFICATION" | "BOOST";
      metadata?: Record<string, unknown>;
    },
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);
    this.ensureLandlordAccess(property, actor);

    const amountCents = Math.round(payload.amount * 100);
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException("Amount must be greater than zero");
    }

    const invoice = await this.paymentsService.createInvoice({
      buyerUserId: actor.userId,
      purpose: (payload.purpose ?? "OTHER") as any,
      currency: payload.currency ?? Currency.USD,
      lines: [
        {
          sku: `${payload.type}-${propertyId}`,
          description:
            payload.description ??
            `${payload.type} payment for ${property.title}`,
          qty: 1,
          unitPriceCents: amountCents,
          taxable: true,
          meta: {
            listingPaymentType: payload.type,
            propertyId,
          },
        },
      ],
    });

    const refreshInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      select: {
        id: true,
        invoiceNo: true,
        status: true,
        currency: true,
        pdfUrl: true,
      },
    });

    // Merge incoming metadata with invoice metadata
    const combinedMetadata = {
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo ?? invoice.id,
      ...(payload.metadata || {}),
    };

    const payment = await this.prisma.listingPayment.create({
      data: {
        propertyId,
        type: payload.type,
        amountCents,
        currency: payload.currency ?? Currency.USD,
        status: ListingPaymentStatus.PENDING,
        reference: invoice.invoiceNo ?? invoice.id,
        invoiceId: invoice.id,
        metadata: combinedMetadata,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            currency: true,
            pdfUrl: true,
          },
        },
      },
    });

    if (refreshInvoice?.pdfUrl) {
      await this.prisma.listingPayment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo ?? invoice.id,
            invoicePdfUrl: refreshInvoice.pdfUrl,
          },
        },
      });
      return {
        ...payment,
        invoice: {
          ...payment.invoice,
          pdfUrl: refreshInvoice.pdfUrl,
        },
      };
    }

    return payment;
  }

  async refreshPropertyVerification(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);
    const isAuthorized =
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId ||
      actor.role === Role.ADMIN;
    if (!isAuthorized) {
      throw new ForbiddenException(
        "Only the property owner or assigned agent can refresh verification",
      );
    }

    const updated =
      await this.verificationsService.refreshPropertyVerification(propertyId);

    await this.audit.logAction({
      action: "property.refreshVerification",
      actorId: actor.userId,
      targetType: "property",
      targetId: propertyId,
      metadata: {
        verificationScore: updated?.verificationScore ?? null,
        verificationLevel: updated?.verificationLevel ?? null,
      },
    });

    return updated;
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
    isAnonymous: boolean = false,
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

  async submitPropertyRating(
    propertyId: string,
    dto: {
      rating: number;
      comment?: string;
      type: string;
      isAnonymous?: boolean;
      tenantMonths?: number;
    },
    actor: AuthContext,
  ) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Role restriction: Landlords/Agents cannot rate their own property
    if (
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId
    ) {
      throw new ForbiddenException("You cannot rate your own property");
    }

    // Check if user already rated this property (unless anonymous)
    if (!dto.isAnonymous) {
      const existingRating = await this.prisma.propertyRating.findUnique({
        where: {
          propertyId_reviewerId: {
            propertyId,
            reviewerId: actor.userId,
          },
        },
      });

      if (existingRating) {
        throw new BadRequestException("You have already rated this property");
      }
    }

    // Determine if user is a verified tenant
    // Check rent payments to determine tenant status
    const rentPayments = await this.prisma.rentPayment.findMany({
      where: {
        propertyId,
        tenantId: actor.userId,
        isVerified: true,
      },
      orderBy: { paidAt: "asc" },
    });

    const isVerifiedTenant = rentPayments.length > 0;
    const firstPayment = rentPayments[0];
    const lastPayment = rentPayments[rentPayments.length - 1];

    // Calculate tenant months if not provided
    let tenantMonths = dto.tenantMonths;
    if (!tenantMonths && firstPayment && lastPayment) {
      const monthsDiff =
        (lastPayment.paidAt.getTime() - firstPayment.paidAt.getTime()) /
        (1000 * 60 * 60 * 24 * 30);
      tenantMonths = Math.round(monthsDiff);
    }

    // Calculate weight
    const weight = this.calculateRatingWeight(
      dto.type as PropertyRatingType,
      isVerifiedTenant,
      tenantMonths,
      dto.isAnonymous,
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
        isVerifiedTenant,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
        },
      },
    });

    await this.audit.logAction({
      action: "property.rating.submit",
      actorId: actor.userId,
      targetType: "property",
      targetId: propertyId,
      metadata: {
        ratingId: rating.id,
        rating: dto.rating,
        weight,
        type: dto.type,
        isAnonymous: dto.isAnonymous,
      },
    });

    // Log activity
    await this.logActivity(
      propertyId,
      ListingActivityType.RATING_SUBMITTED,
      dto.isAnonymous ? null : actor.userId,
      {
        ratingId: rating.id,
        rating: dto.rating,
        type: dto.type,
      },
    );

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
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate aggregated weighted score
    const totalWeight = ratings.reduce(
      (sum: number, r: { weight: number }) => sum + r.weight,
      0,
    );
    const weightedSum = ratings.reduce(
      (sum: number, r: { rating: number; weight: number }) =>
        sum + r.rating * r.weight,
      0,
    );
    const averageRating = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const roundedAverage = Math.round(averageRating * 10) / 10; // Round to 1 decimal

    // Count by rating value
    const ratingCounts = ratings.reduce(
      (acc: Record<number, number>, r: { rating: number }) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

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
          1: ratingCounts[1] || 0,
        },
      },
      userRating:
        ratings.find(
          (r: { reviewerId: string | null; isAnonymous: boolean }) =>
            r.reviewerId === actor.userId && !r.isAnonymous,
        ) || null,
    };
  }

  /**
   * Log a listing activity (non-blocking)
   */
  private async logActivity(
    propertyId: string,
    type: ListingActivityType,
    actorId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.listingActivityLog.create({
        data: {
          propertyId,
          type,
          actorId,
          metadata: metadata ? (metadata as Prisma.JsonObject) : undefined,
        },
      });
    } catch (error) {
      // Non-blocking: log errors but don't fail the main operation
      this.logger.warn(
        `Failed to log activity ${type} for property ${propertyId}`,
        error,
      );
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
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to most recent 100 activities
    });

    // Aggregate statistics
    const stats = {
      offers: {
        received: 0,
        accepted: 0,
        rejected: 0,
        confirmed: 0,
        onHold: 0,
      },
      payments: {
        created: 0,
        paid: 0,
        failed: 0,
        totalAmount: 0,
      },
      verification: {
        submitted: 0,
        approved: 0,
        rejected: 0,
      },
      viewings: {
        scheduled: 0,
        accepted: 0,
        postponed: 0,
        cancelled: 0,
      },
      chatMessages: 0,
      ratings: 0,
      views: 0,
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
          if (
            log.metadata &&
            typeof log.metadata === "object" &&
            "amount" in log.metadata
          ) {
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
      statistics: stats,
    };
  }

  async listViewings(propertyId: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(propertyId);

    // Verify actor is landlord or agent
    const isAuthorized =
      property.landlordId === actor.userId ||
      property.agentOwnerId === actor.userId;
    if (!isAuthorized && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        "Only the property owner or assigned agent can view viewing requests",
      );
    }

    return this.prisma.viewing.findMany({
      where: { propertyId },
      include: {
        viewer: { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true } },
        landlord: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }
}

function messagesRecipient(
  property: { landlordId: string | null; agentOwnerId: string | null },
  senderId: string,
) {
  if (senderId === property.landlordId) {
    return property.agentOwnerId ?? property.landlordId; // Self message if no agent?
  }
  return property.landlordId;
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  PowerPhase,
  Prisma,
  PropertyAvailability,
  PropertyFurnishing,
  PropertyStatus,
  PropertyType,
  Role,
  RewardEventType
} from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import { extname } from 'path';
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

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4']);

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly geo: GeoService
  ) {}

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
    return {
      ...property,
      countryName: property.country?.name ?? null,
      provinceName: property.province?.name ?? null,
      cityName: property.city?.name ?? null,
      suburbName: property.suburb?.name ?? null,
      location: {
        countryId: property.countryId ?? null,
        country: property.country
          ? { id: property.country.id, name: property.country.name, iso2: property.country.iso2, phoneCode: property.country.phoneCode }
          : null,
        provinceId: property.provinceId ?? null,
        province: property.province ? { id: property.province.id, name: property.province.name } : null,
        cityId: property.cityId ?? null,
        city: property.city ? { id: property.city.id, name: property.city.name } : null,
        suburbId: property.suburbId ?? null,
        suburb: property.suburb ? { id: property.suburb.id, name: property.suburb.name } : null,
        pendingGeoId: property.pendingGeoId ?? null,
        lat: typeof property.lat === 'number' ? property.lat : null,
        lng: typeof property.lng === 'number' ? property.lng : null
      }
    };
  }

  private attachLocationToMany<T extends Record<string, any>>(properties: T[]) {
    return properties.map((property) => this.attachLocation(property));
  }

  private normalizeCommercialFields(
    input: CreatePropertyDto['commercialFields'] | UpdatePropertyDto['commercialFields']
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
      pendingGeo: true
    } satisfies Prisma.PropertyInclude;

    if (actor.role === Role.ADMIN) {
      return this.prisma.property
        .findMany({ orderBy: { createdAt: 'desc' }, include })
        .then((properties) => this.attachLocationToMany(properties));
    }

    if (actor.role === Role.LANDLORD) {
      return this.prisma.property
        .findMany({
          where: { landlordId: actor.userId },
          orderBy: { createdAt: 'desc' },
          include
        })
        .then((properties) => this.attachLocationToMany(properties));
    }

    if (actor.role === Role.AGENT) {
      return this.prisma.property
        .findMany({
          where: { agentOwnerId: actor.userId },
          orderBy: { createdAt: 'desc' },
          include
        })
        .then((properties) => this.attachLocationToMany(properties));
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

  async create(dto: CreatePropertyDto, actor: AuthContext) {
    const landlordId = dto.landlordId ?? (actor.role === Role.LANDLORD ? actor.userId : undefined);
    const agentOwnerId = dto.agentOwnerId ?? (actor.role === Role.AGENT ? actor.userId : undefined);

    const location = await this.geo.resolveLocation({
      countryId: dto.countryId ?? null,
      provinceId: dto.provinceId ?? null,
      cityId: dto.cityId ?? null,
      suburbId: dto.suburbId ?? null,
      pendingGeoId: dto.pendingGeoId ?? null
    });

    const availableFrom =
      dto.availability === PropertyAvailability.DATE && dto.availableFrom
        ? new Date(dto.availableFrom)
        : null;
    const commercialFields = this.normalizeCommercialFields(dto.commercialFields);

    const property = await this.prisma.property.create({
      data: {
        landlordId,
        agentOwnerId,
        type: dto.type,
        currency: dto.currency,
        price: new Prisma.Decimal(dto.price),
        countryId: location.country?.id ?? dto.countryId ?? null,
        provinceId: location.province?.id ?? dto.provinceId ?? null,
        cityId: location.city?.id ?? dto.cityId ?? null,
        suburbId: location.suburb?.id ?? dto.suburbId ?? null,
        pendingGeoId: location.pendingGeo?.id ?? null,
        lat: typeof dto.lat === 'number' ? dto.lat : null,
        lng: typeof dto.lng === 'number' ? dto.lng : null,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        amenities: dto.amenities ?? [],
        furnishing: dto.furnishing ?? PropertyFurnishing.NONE,
        availability: dto.availability ?? PropertyAvailability.IMMEDIATE,
        availableFrom,
        commercialFields,
        description: dto.description,
        status: PropertyStatus.DRAFT
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

    return this.attachLocation(property);
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

    const location = await this.geo.resolveLocation({
      countryId: countryId ?? existing.countryId ?? null,
      provinceId: provinceId ?? existing.provinceId ?? null,
      cityId: cityId ?? existing.cityId ?? null,
      suburbId: suburbId ?? existing.suburbId ?? null,
      pendingGeoId:
        pendingGeoId !== undefined
          ? pendingGeoId
          : countryId !== undefined ||
              provinceId !== undefined ||
              cityId !== undefined ||
              suburbId !== undefined
            ? null
            : existing.pendingGeoId ?? null
    });

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
        countryId: location.country?.id ?? existing.countryId,
        provinceId: location.province?.id ?? existing.provinceId,
        cityId: location.city?.id ?? existing.cityId,
        suburbId: location.suburb?.id ?? existing.suburbId,
        pendingGeoId: location.pendingGeo?.id ?? null,
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

    return { success: true };
  }

  async assignVerifiedAgent(id: string, dto: AssignAgentDto, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureLandlordAccess(property, actor);

    const agent = await this.prisma.user.findFirst({
      where: {
        id: dto.agentId,
        role: Role.AGENT,
        agentProfile: {
          verifiedListingsCount: { gt: 0 },
          kycStatus: 'VERIFIED'
        }
      },
      select: {
        id: true
      }
    });

    if (!agent) {
      throw new BadRequestException('Agent must be verified before assignment');
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

    return assignment;
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

    return this.attachLocation(updated);
  }

  async listMessages(id: string, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureConversationAccess(property, actor);

    const messages = await this.prisma.propertyMessage.findMany({
      where: { propertyId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } }
      }
    });

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
    const property = await this.getPropertyOrThrow(id);
    this.ensureConversationAccess(property, actor);

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Message cannot be empty');
    }

    const recipientId = this.resolveConversationRecipient(property, actor);

    const message = await this.prisma.propertyMessage.create({
      data: {
        propertyId: id,
        senderId: actor.userId,
        recipientId,
        body
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } }
      }
    });

    await this.audit.log({
      action: 'property.message.send',
      actorId: actor.userId,
      targetType: 'property',
      targetId: id,
      metadata: { messageId: message.id }
    });

    return message;
  }

  async submitForVerification(id: string, dto: SubmitForVerificationDto, actor: AuthContext) {
    const property = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(property, actor);

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
      metadata: dto
    });

    return this.attachLocation(updated);
  }

  async search(dto: SearchPropertiesDto) {
    const filters = this.normalizeSearchFilters(dto);

    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.VERIFIED
    };

    const andConditions: Prisma.PropertyWhereInput[] = [];

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

    if (typeof filters.priceMin === 'number' || typeof filters.priceMax === 'number') {
      where.price = {};
      if (typeof filters.priceMin === 'number') {
        where.price.gte = filters.priceMin;
      }
      if (typeof filters.priceMax === 'number') {
        where.price.lte = filters.priceMax;
      }
    }

    if (filters.bounds) {
      const southLat = Math.min(filters.bounds.southWest.lat, filters.bounds.northEast.lat);
      const northLat = Math.max(filters.bounds.southWest.lat, filters.bounds.northEast.lat);
      const westLng = Math.min(filters.bounds.southWest.lng, filters.bounds.northEast.lng);
      const eastLng = Math.max(filters.bounds.southWest.lng, filters.bounds.northEast.lng);

      where.lat = {
        gte: southLat,
        lte: northLat
      };

      where.lng = {
        gte: westLng,
        lte: eastLng
      };
    }

    if (typeof filters.bedrooms === 'number') {
      where.bedrooms = { gte: filters.bedrooms };
    }

    if (typeof filters.bathrooms === 'number') {
      where.bathrooms = { gte: filters.bathrooms };
    }

    if (filters.furnished) {
      where.furnishing = filters.furnished;
    }

    if (filters.amenities?.length) {
      where.amenities = { hasEvery: filters.amenities };
    }

    if (typeof filters.minFloorArea === 'number') {
      andConditions.push({
        commercialFields: {
          path: ['floorAreaSqm'],
          gte: filters.minFloorArea
        }
      });
    }

    if (filters.zoning) {
      andConditions.push({
        commercialFields: {
          path: ['zoning'],
          string_contains: filters.zoning,
          string_mode: 'insensitive'
        }
      });
    }

    if (filters.parking === true) {
      andConditions.push({
        commercialFields: {
          path: ['parkingBays'],
          gte: 1
        }
      });
    }

    if (filters.powerPhase) {
      andConditions.push({
        commercialFields: {
          path: ['powerPhase'],
          equals: filters.powerPhase
        }
      });
    }

    if (andConditions.length) {
      where.AND = [...(where.AND ?? []), ...andConditions];
    }

    const perPage = Math.min(Math.max(dto.limit ?? 20, 1), 50);
    const page = Math.max(dto.page ?? 1, 1);
    const skip = (page - 1) * perPage;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        orderBy: [
          {
            promoBoosts: {
              _count: 'desc'
            }
          },
          { verifiedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: perPage,
        include: {
          media: { take: 3 },
          country: true,
          province: true,
          city: true,
          suburb: true,
          pendingGeo: true
        }
      })
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);

    return {
      items: this.attachLocationToMany(items),
      page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages
    };
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

  async findById(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        media: true,
        landlord: true,
        agentOwner: true,
        country: true,
        province: true,
        city: true,
        suburb: true,
        pendingGeo: true
      }
    });

    if (!property || property.status !== 'VERIFIED') {
      throw new NotFoundException('Property not found');
    }

    return this.attachLocation(property);
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

  private async getPropertyOrThrow(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  private ensureCanMutate(
    property: { landlordId: string | null; agentOwnerId: string | null },
    actor: AuthContext
  ) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    const isLandlordOwner = actor.role === Role.LANDLORD && property.landlordId === actor.userId;
    const isAgentOwner = actor.role === Role.AGENT && property.agentOwnerId === actor.userId;

    if (!isLandlordOwner && !isAgentOwner) {
      throw new ForbiddenException('You do not have access to this property');
    }
  }

  private ensureLandlordAccess(property: { landlordId: string | null }, actor: AuthContext) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (actor.role !== Role.LANDLORD) {
      throw new ForbiddenException('Only landlords can perform this action');
    }

    if (property.landlordId && property.landlordId !== actor.userId) {
      throw new ForbiddenException('You do not own this property');
    }
  }

  private ensureConversationAccess(
    property: { landlordId: string | null; agentOwnerId: string | null },
    actor: AuthContext
  ) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    const isLandlord = actor.role === Role.LANDLORD && property.landlordId === actor.userId;
    const isAgent = actor.role === Role.AGENT && property.agentOwnerId === actor.userId;

    if (!isLandlord && !isAgent) {
      throw new ForbiddenException('You are not part of this conversation');
    }
  }

  private resolveConversationRecipient(
    property: { landlordId: string | null; agentOwnerId: string | null },
    actor: AuthContext
  ) {
    if (actor.role === Role.LANDLORD) {
      if (!property.agentOwnerId) {
        throw new BadRequestException('Assign a verified agent before messaging');
      }
      return property.agentOwnerId;
    }

    if (actor.role === Role.AGENT) {
      if (!property.landlordId) {
        throw new BadRequestException('Landlord contact not available for this property');
      }
      return property.landlordId;
    }

    throw new ForbiddenException('Only landlords and assigned agents can send messages');
  }
}

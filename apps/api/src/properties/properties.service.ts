import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, PropertyStatus, PropertyType, Role, RewardEventType } from '@prisma/client';
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

type LocationInput = {
  city?: string | null;
  suburb?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type NormalizedBounds = {
  southWest: { lat: number; lng: number };
  northEast: { lat: number; lng: number };
};

type NormalizedFilters = {
  type?: PropertyType;
  city?: string;
  suburb?: string;
  priceMin?: number;
  priceMax?: number;
  bounds?: NormalizedBounds;
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

  private pickNumber(...values: Array<number | null | undefined>): number | null {
    for (const value of values) {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
    }

    return null;
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

  private attachLocation<T extends LocationInput & Record<string, any>>(property: T) {
    return {
      ...property,
      location: {
        city: property.city ?? '',
        suburb: property.suburb ?? null,
        lat: property.latitude ?? null,
        lng: property.longitude ?? null
      }
    };
  }

  private attachLocationToMany<T extends LocationInput & Record<string, any>>(properties: T[]) {
    return properties.map((property) => this.attachLocation(property));
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

    const city = this.pickString(parsedFilters.city as string | undefined, dto.city);
    const suburb = this.pickString(parsedFilters.suburb as string | undefined, dto.suburb);

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

    return { type, city: city ?? undefined, suburb: suburb ?? undefined, priceMin, priceMax, bounds };
  }

  private async resolveLocation(
    input: LocationInput,
    fallback: LocationInput = {}
  ): Promise<{ city: string; suburb: string | null; latitude: number | null; longitude: number | null }> {
    const latitude = this.pickNumber(input.latitude, fallback.latitude);
    const longitude = this.pickNumber(input.longitude, fallback.longitude);

    let city = this.pickString(input.city, fallback.city);
    let suburb = this.pickString(input.suburb, fallback.suburb) ?? null;

    if ((!city || !suburb) && latitude !== null && longitude !== null) {
      const result = this.geo.reverseGeocode(latitude, longitude);
      if (result) {
        city = city ?? result.city;
        suburb = suburb ?? result.suburb ?? null;
      }
    }

    if (!city) {
      throw new BadRequestException('City is required. Provide a city or valid coordinates.');
    }

    return {
      city,
      suburb,
      latitude,
      longitude
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
      }
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

    const location = await this.resolveLocation({
      city: dto.city,
      suburb: dto.suburb,
      latitude: dto.latitude,
      longitude: dto.longitude
    });

    const property = await this.prisma.property.create({
      data: {
        landlordId,
        agentOwnerId,
        type: dto.type,
        currency: dto.currency,
        price: new Prisma.Decimal(dto.price),
        city: location.city,
        suburb: location.suburb,
        latitude: location.latitude,
        longitude: location.longitude,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        amenities: dto.amenities ?? [],
        description: dto.description,
        status: PropertyStatus.DRAFT
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

    const { amenities, price: priceInput, ...rest } = dto;
    const price = priceInput !== undefined ? new Prisma.Decimal(priceInput) : undefined;

    const { city, suburb, latitude, longitude, ...other } = rest;

    const location = await this.resolveLocation(
      { city, suburb, latitude, longitude },
      {
        city: existing.city,
        suburb: existing.suburb,
        latitude: existing.latitude,
        longitude: existing.longitude
      }
    );

    const filtered = this.removeUndefined(other);

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        ...filtered,
        city: location.city,
        suburb: location.suburb,
        latitude: location.latitude,
        longitude: location.longitude,
        ...(price !== undefined ? { price } : {}),
        amenities: amenities ?? existing.amenities
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
          }
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

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.suburb) {
      where.suburb = { contains: filters.suburb, mode: 'insensitive' };
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

      where.latitude = {
        gte: southLat,
        lte: northLat
      };

      where.longitude = {
        gte: westLng,
        lte: eastLng
      };
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
          media: { take: 3 }
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
        latitude: {
          gte: southLat,
          lte: northLat
        },
        longitude: {
          gte: westLng,
          lte: eastLng
        },
        ...(dto.type ? { type: dto.type } : {})
      },
      include: { media: { take: 3 } }
    });

    return this.attachLocationToMany(properties);
  }

  async findById(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        media: true,
        landlord: true,
        agentOwner: true
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

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, PropertyStatus, Role } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import { extname } from 'path';
import { env } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { SubmitForVerificationDto } from './dto/submit-verification.dto';
import { MapBoundsDto } from './dto/map-bounds.dto';
import { CreateSignedUploadDto } from './dto/signed-upload.dto';
import { SearchPropertiesDto } from './dto/search-properties.dto';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4']);

type AuthContext = {
  userId: string;
  role: Role;
};

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(dto: CreatePropertyDto, actor: AuthContext) {
    const landlordId = dto.landlordId ?? (actor.role === Role.LANDLORD ? actor.userId : undefined);
    const agentOwnerId = dto.agentOwnerId ?? (actor.role === Role.AGENT ? actor.userId : undefined);

    const property = await this.prisma.property.create({
      data: {
        landlordId,
        agentOwnerId,
        type: dto.type,
        currency: dto.currency,
        price: new Prisma.Decimal(dto.price),
        city: dto.city,
        suburb: dto.suburb,
        latitude: dto.latitude,
        longitude: dto.longitude,
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

    return property;
  }

  async update(id: string, dto: UpdatePropertyDto, actor: AuthContext) {
    const existing = await this.getPropertyOrThrow(id);
    this.ensureCanMutate(existing, actor);

    const { amenities, price: priceInput, ...rest } = dto;
    const price = priceInput !== undefined ? new Prisma.Decimal(priceInput) : undefined;

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        ...rest,
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

    return property;
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

    return updated;
  }

  search(dto: SearchPropertiesDto) {
    const where: any = {
      status: 'VERIFIED'
    };

    if (dto.type) {
      where.type = dto.type;
    }

    if (dto.city) {
      where.city = { contains: dto.city, mode: 'insensitive' };
    }

    if (dto.suburb) {
      where.suburb = { contains: dto.suburb, mode: 'insensitive' };
    }

    const hasMin = dto.priceMin !== undefined && dto.priceMin !== null;
    const hasMax = dto.priceMax !== undefined && dto.priceMax !== null;

    if (hasMin || hasMax) {
      where.price = {};
      if (hasMin) {
        where.price.gte = dto.priceMin;
      }
      if (hasMax) {
        where.price.lte = dto.priceMax;
      }
    }

    return this.prisma.property.findMany({
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
      take: dto.limit ?? 20,
      include: {
        media: { take: 3 }
      }
    });
  }

  async mapBounds(dto: MapBoundsDto) {
    return this.prisma.property.findMany({
      where: {
        status: PropertyStatus.VERIFIED,
        latitude: {
          gte: dto.southWestLat,
          lte: dto.northEastLat
        },
        longitude: {
          gte: dto.southWestLng,
          lte: dto.northEastLng
        },
        ...(dto.type ? { type: dto.type } : {})
      },
      include: { media: { take: 3 } }
    });
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

    return property;
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
}

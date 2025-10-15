import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { Prisma, PropertyStatus, Role, RewardEventType } from '@prisma/client';
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

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

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
      return this.prisma.property.findMany({ orderBy: { createdAt: 'desc' }, include });
    }

    if (actor.role === Role.LANDLORD) {
      return this.prisma.property.findMany({
        where: { landlordId: actor.userId },
        orderBy: { createdAt: 'desc' },
        include
      });
    }

    if (actor.role === Role.AGENT) {
      return this.prisma.property.findMany({
        where: { agentOwnerId: actor.userId },
        orderBy: { createdAt: 'desc' },
        include
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

    return updated;
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

    return updated;
  }

  async search(dto: SearchPropertiesDto) {
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
      items,
      page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages
    };
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

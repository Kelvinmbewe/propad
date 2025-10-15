import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchPropertiesDto } from './dto/search-properties.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

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
}

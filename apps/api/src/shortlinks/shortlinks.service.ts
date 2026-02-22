import { Injectable } from '@nestjs/common';
import { LeadSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShortLinkDto } from './dto/create-shortlink.dto';
import { TrackClickDto } from './dto/track-click.dto';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 7);

@Injectable()
export class ShortLinksService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateShortLinkDto) {
    const code = await this.generateCode();

    return this.prisma.shortLink.create({
      data: {
        code,
        targetUrl: dto.targetUrl,
        propertyId: dto.propertyId,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        utmTerm: dto.utmTerm,
        utmContent: dto.utmContent
      }
    });
  }

  async registerClick(code: string, dto: TrackClickDto) {
    const shortLink = await this.prisma.shortLink.update({
      where: { code },
      data: {
        clicks: { increment: 1 }
      }
    });

    if (shortLink.propertyId && shortLink.utmSource?.toLowerCase() === 'whatsapp') {
      const existingLead = await this.prisma.lead.findFirst({
        where: {
          propertyId: shortLink.propertyId,
          source: LeadSource.WHATSAPP,
          channelRef: code
        }
      });

      if (!existingLead) {
        await this.prisma.lead.create({
          data: {
            propertyId: shortLink.propertyId,
            source: LeadSource.WHATSAPP,
            channelRef: dto.channelRef ?? code,
            contactPhone: dto.contactPhone ?? 'UNKNOWN'
          }
        });
      }
    }

    return shortLink;
  }

  findByCode(code: string) {
    return this.prisma.shortLink.findUnique({ where: { code } });
  }

  private async generateCode(): Promise<string> {
    while (true) {
      const code = nanoid();
      const existing = await this.prisma.shortLink.findUnique({ where: { code } });
      if (!existing) {
        return code;
      }
    }
  }
}

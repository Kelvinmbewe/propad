import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadSource } from '@prisma/client';
import { subDays } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

interface AuthContext {
  userId: string;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) { }

  async create(dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        propertyId: dto.propertyId,
        userId: dto.userId,
        source: dto.source,
        channelRef: dto.channelRef,
        contactPhone: dto.contactPhone
      }
    });

    await this.audit.log({
      action: 'lead.create',
      actorId: dto.userId,
      targetType: 'property',
      targetId: dto.propertyId,
      metadata: { source: dto.source, leadId: lead.id }
    });

    return lead;
  }

  async updateStatus(id: string, dto: UpdateLeadStatusDto, actor: AuthContext) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: { status: dto.status }
    });

    await this.audit.log({
      action: 'lead.updateStatus',
      actorId: actor.userId,
      targetType: 'lead',
      targetId: id,
      metadata: { status: dto.status }
    });

    return updated;
  }

  async analytics(actor?: AuthContext & { role: string }) {
    const where: any = {};
    if (actor && actor.role === 'AGENT') {
      where.property = { agentOwnerId: actor.userId };
    } else if (actor && actor.role === 'LANDLORD') {
      where.property = { landlordId: actor.userId };
    }

    const [statusCounts, sourceCounts, recentLeads] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ['status'],
        _count: { _all: true },
        where
      }),
      this.prisma.lead.groupBy({
        by: ['source'],
        _count: { _all: true },
        where
      }),
      this.prisma.lead.findMany({
        where: {
          ...where,
          createdAt: { gte: subDays(new Date(), 30) }
        },
        select: { id: true, createdAt: true, source: true }
      })
    ]);

    const daily: Record<string, number> = {};
    for (const lead of recentLeads) {
      const key = lead.createdAt.toISOString().slice(0, 10);
      daily[key] = (daily[key] ?? 0) + 1;
    }

    const typedSourceCounts = sourceCounts as Array<{ source: LeadSource; _count: { _all: number } }>;
    const sourceBreakdown = typedSourceCounts.reduce<Record<LeadSource, number>>((acc, curr) => {
      acc[curr.source] = curr._count._all;
      return acc;
    }, {
      [LeadSource.WEB]: 0,
      [LeadSource.WHATSAPP]: 0,
      [LeadSource.FACEBOOK]: 0,
      [LeadSource.SHORTLINK]: 0
    });

    return {
      status: statusCounts,
      source: sourceBreakdown,
      daily
    };
  }

  async findAll(actor: AuthContext & { role: string }) {
    const where: any = {};
    if (actor.role === 'AGENT') {
      where.property = { agentOwnerId: actor.userId };
    } else if (actor.role === 'LANDLORD') {
      where.property = { landlordId: actor.userId };
    } else if (actor.role === 'ADMIN') {
      // No filter, show all
    } else {
      // Empty for others
      return [];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: false, // Don't expose private address unless needed
            suburb: true,
            city: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}

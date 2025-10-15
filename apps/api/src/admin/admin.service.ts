import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrikeDto } from './dto/create-strike.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createStrike(dto: CreateStrikeDto, actorId: string) {
    const strike = await this.prisma.policyStrike.create({
      data: {
        agentId: dto.agentId,
        reason: dto.reason,
        severity: dto.severity
      }
    });

    await this.audit.log({
      action: 'admin.strike',
      actorId,
      targetType: 'agent',
      targetId: dto.agentId,
      metadata: { strikeId: strike.id, reason: dto.reason, notes: dto.notes }
    });

    return strike;
  }

  listStrikes(agentId?: string) {
    return this.prisma.policyStrike.findMany({
      where: agentId ? { agentId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async updateFeatureFlag(dto: UpdateFeatureFlagDto, actorId: string) {
    const flag = await this.prisma.featureFlag.upsert({
      where: { key: dto.key },
      update: { enabled: dto.enabled, description: dto.description },
      create: { key: dto.key, enabled: dto.enabled, description: dto.description }
    });

    await this.audit.log({
      action: 'admin.featureFlag',
      actorId,
      targetType: 'featureFlag',
      targetId: dto.key,
      metadata: { enabled: dto.enabled }
    });

    return flag;
  }

  listFeatureFlags() {
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  async exportPropertiesCsv() {
    const properties = await this.prisma.property.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' }
    });

    return this.toCsv(properties);
  }

  async exportLeadsCsv() {
    const leads = await this.prisma.lead.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' }
    });

    return this.toCsv(leads);
  }

  async analyticsSummary() {
    const [properties, leads, rewards, payouts] = await Promise.all([
      this.prisma.property.count({ where: { status: 'VERIFIED' } }),
      this.prisma.lead.count(),
      this.prisma.rewardEvent.aggregate({ _sum: { usdCents: true, points: true } }),
      this.prisma.payout.aggregate({ _sum: { amountUsdCents: true } })
    ]);

    return {
      verifiedProperties: properties,
      totalLeads: leads,
      rewardPoolUsd: (rewards._sum.usdCents ?? 0) / 100,
      rewardPoints: rewards._sum.points ?? 0,
      payoutsUsd: (payouts._sum.amountUsdCents ?? 0) / 100
    };
  }

  private toCsv(records: any[]) {
    if (records.length === 0) {
      return '';
    }
    const headers = Object.keys(records[0]);
    const rows = [headers.join(',')];
    for (const record of records) {
      rows.push(
        headers
          .map((key) => {
            const value = record[key];
            if (value === null || value === undefined) {
              return '';
            }
            if (value instanceof Date) {
              return value.toISOString();
            }
            const stringValue = String(value).replace(/"/g, '""');
            return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
          })
          .join(',')
      );
    }
    return rows.join('\n');
  }
}

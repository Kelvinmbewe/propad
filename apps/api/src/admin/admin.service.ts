import { Injectable } from '@nestjs/common';
import { InvoiceStatus, PayoutStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrikeDto } from './dto/create-strike.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { PaymentsService } from '../payments/payments.service';
import { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly payments: PaymentsService
  ) {}

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
      this.prisma.payoutRequest.aggregate({
        where: { status: PayoutStatus.PAID },
        _sum: { amountCents: true }
      })
    ]);

    return {
      verifiedProperties: properties,
      totalLeads: leads,
      rewardPoolUsd: (rewards._sum.usdCents ?? 0) / 100,
      rewardPoints: rewards._sum.points ?? 0,
      payoutsUsd: (payouts._sum.amountCents ?? 0) / 100
    };
  }

  listInvoices(status?: InvoiceStatus) {
    return this.prisma.invoice.findMany({
      where: status ? { status } : undefined,
      include: {
        lines: true,
        promoBoost: { select: { id: true } },
        campaign: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async exportInvoicesCsv(status?: InvoiceStatus) {
    const invoices = await this.listInvoices(status);
    const simplified = invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo ?? invoice.id,
      status: invoice.status,
      totalCents: invoice.amountCents + invoice.taxCents,
      currency: invoice.currency,
      dueAt: invoice.dueAt?.toISOString() ?? '',
      issuedAt: invoice.issuedAt?.toISOString() ?? '',
      promoBoostId: invoice.promoBoost?.id ?? '',
      campaignId: invoice.campaign?.id ?? ''
    }));

    return this.toCsv(simplified);
  }

  markInvoicePaid(id: string, dto: MarkInvoicePaidDto, actorId: string) {
    return this.payments.markInvoicePaidOffline({
      invoiceId: id,
      amountCents: dto.amountCents,
      notes: dto.notes,
      paidAt: dto.paidAt,
      actorId
    });
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

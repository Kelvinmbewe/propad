import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentGateway,
  PaymentIntentStatus,
  PayoutStatus,
  TransactionResult
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrikeDto } from './dto/create-strike.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { PaymentsService } from '../payments/payments.service';
import { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import { ListPaymentIntentsDto } from './dto/list-payment-intents.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { CreateFxRateDto } from './dto/create-fx-rate.dto';
import { AppConfigService } from '../app-config/app-config.service';
import { UpdateAppConfigDto } from './dto/update-app-config.dto';

type InvoiceCsvSource = {
  id: string;
  invoiceNo: string | null;
  status: InvoiceStatus;
  amountCents: number;
  taxCents: number;
  amountUsdCents: number;
  taxUsdCents: number;
  currency: string;
  dueAt: Date | null;
  issuedAt: Date | null;
  promoBoost: { id: string } | null;
  campaign: { id: string } | null;
};

type PaymentIntentCsvSource = {
  id: string;
  invoiceId: string;
  invoice?: { id: string; invoiceNo: string | null } | null;
  gateway: PaymentGateway;
  status: PaymentIntentStatus;
  amountCents: number;
  currency: string;
  reference: string | null;
  createdAt: Date;
};

type TransactionCsvSource = {
  id: string;
  invoiceId: string;
  invoice?: { id: string; invoiceNo: string | null } | null;
  gateway: PaymentGateway;
  result: TransactionResult;
  amountCents: number;
  netCents: number;
  feeCents: number;
  currency: string;
  externalRef: string | null;
  createdAt: Date;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly payments: PaymentsService,
    private readonly appConfig: AppConfigService
  ) { }

  async createStrike(dto: CreateStrikeDto, actorId: string) {
    const strike = await this.prisma.policyStrike.create({
      data: {
        agentId: dto.agentId,
        reason: dto.reason,
        severity: dto.severity
      }
    });

    await this.audit.logAction({
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

    await this.audit.logAction({
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
        campaign: { select: { id: true } },
        fxRate: true
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async exportInvoicesCsv(status?: InvoiceStatus) {
    const invoices = (await this.listInvoices(status)) as InvoiceCsvSource[];
    const simplified = invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo ?? invoice.id,
      status: invoice.status,
      totalCents: invoice.amountCents + invoice.taxCents,
      subtotalUsdCents: invoice.amountUsdCents,
      taxUsdCents: invoice.taxUsdCents,
      totalUsdCents: invoice.amountUsdCents + invoice.taxUsdCents,
      currency: invoice.currency,
      dueAt: invoice.dueAt?.toISOString() ?? '',
      issuedAt: invoice.issuedAt?.toISOString() ?? '',
      promoBoostId: invoice.promoBoost?.id ?? '',
      campaignId: invoice.campaign?.id ?? ''
    }));

    return this.toCsv(simplified);
  }

  listPaymentIntents(filters: ListPaymentIntentsDto) {
    return this.prisma.paymentIntent.findMany({
      where: {
        status: filters.status ?? undefined,
        gateway: filters.gateway ?? undefined,
        invoiceId: filters.invoiceId ?? undefined
      },
      include: {
        invoice: { select: { id: true, invoiceNo: true, status: true, currency: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async exportPaymentIntentsCsv(filters: ListPaymentIntentsDto) {
    const intents = (await this.listPaymentIntents(filters)) as PaymentIntentCsvSource[];
    const simplified = intents.map((intent) => ({
      id: intent.id,
      invoiceId: intent.invoiceId,
      invoiceNo: intent.invoice?.invoiceNo ?? intent.invoice?.id ?? intent.invoiceId,
      gateway: intent.gateway,
      status: intent.status,
      amountCents: intent.amountCents,
      currency: intent.currency,
      reference: intent.reference,
      createdAt: intent.createdAt
    }));

    return this.toCsv(simplified);
  }

  listTransactions(filters: ListTransactionsDto) {
    return this.prisma.transaction.findMany({
      where: {
        result: filters.result ?? undefined,
        gateway: filters.gateway ?? undefined,
        invoiceId: filters.invoiceId ?? undefined
      },
      include: {
        invoice: { select: { id: true, invoiceNo: true, status: true, currency: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  async exportTransactionsCsv(filters: ListTransactionsDto) {
    const transactions = (await this.listTransactions(filters)) as TransactionCsvSource[];
    const simplified = transactions.map((tx) => ({
      id: tx.id,
      invoiceId: tx.invoiceId,
      invoiceNo: tx.invoice?.invoiceNo ?? tx.invoice?.id ?? tx.invoiceId,
      gateway: tx.gateway,
      result: tx.result,
      amountCents: tx.amountCents,
      netCents: tx.netCents,
      feeCents: tx.feeCents,
      currency: tx.currency,
      externalRef: tx.externalRef,
      createdAt: tx.createdAt
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

  async createFxRate(dto: CreateFxRateDto, actorId: string) {
    const effectiveDate = new Date(dto.effectiveDate);
    effectiveDate.setUTCHours(0, 0, 0, 0);
    const rateMicros = Math.round(dto.rate * 1_000_000);

    const fxRate = await this.prisma.fxRate.upsert({
      where: {
        base_quote_date: {
          base: dto.base,
          quote: dto.quote,
          date: effectiveDate
        }
      },
      update: { rateMicros },
      create: {
        base: dto.base,
        quote: dto.quote,
        rateMicros,
        date: effectiveDate
      }
    });

    await this.audit.logAction({
      action: 'admin.fxRate.upsert',
      actorId,
      targetType: 'fxRate',
      targetId: fxRate.id,
      metadata: {
        base: dto.base,
        quote: dto.quote,
        rate: dto.rate,
        effectiveDate: effectiveDate.toISOString()
      }
    });

    return fxRate;
  }

  getAppConfig() {
    return this.appConfig.getConfig();
  }

  updateAppConfig(dto: UpdateAppConfigDto, actorId: string) {
    return this.appConfig.updateConfig(dto.config, actorId);
  }

  listUsers(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        verificationScore: true,
        trustScore: true,
        kycStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  listAgencies() {
    return this.prisma.agency.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        trustScore: true,
        verificationScore: true,
        createdAt: true,
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
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

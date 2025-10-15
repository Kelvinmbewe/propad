import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Currency,
  Invoice,
  InvoiceLine,
  InvoicePurpose,
  InvoiceStatus,
  PaymentGateway,
  PaymentIntentStatus,
  Prisma,
  TransactionResult
} from '@prisma/client';
import { startOfDay } from 'date-fns';
import PDFDocument from 'pdfkit';
import { env } from '@propad/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentGatewayRegistry } from './payment-gateway.registry';

const VAT_SCALE = 100;

type PrismaTx = Prisma.TransactionClient;

type InvoiceLineInput = {
  sku: string;
  description: string;
  qty: number;
  unitPriceCents: number;
  meta?: Record<string, unknown>;
};

type CreateInvoiceOptions = {
  buyerUserId?: string;
  buyerAgencyId?: string;
  purpose: InvoicePurpose;
  currency: Currency;
  lines: InvoiceLineInput[];
  dueAt?: Date;
  link?: {
    promoBoostId?: string;
    campaignId?: string;
  };
};

type CreatePaymentIntentOptions = {
  invoiceId: string;
  gateway: PaymentGateway;
  returnUrl?: string;
};

type OfflinePaymentOptions = {
  invoiceId: string;
  amountCents: number;
  actorId: string;
  notes?: string;
  paidAt?: Date;
};

@Injectable()
export class PaymentsService {
  private readonly vatRate = (env.VAT_PERCENT ?? 15) / VAT_SCALE;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly registry: PaymentGatewayRegistry
  ) {}

  async createInvoice(options: CreateInvoiceOptions, tx?: PrismaTx) {
    const client = tx ?? this.prisma;

    if (options.lines.length === 0) {
      throw new BadRequestException('Invoice requires at least one line item');
    }

    const subtotal = options.lines.reduce((acc, line) => acc + line.qty * line.unitPriceCents, 0);
    const tax = Math.round(subtotal * this.vatRate);

    const invoice = await client.invoice.create({
      data: {
        buyerUserId: options.buyerUserId,
        buyerAgencyId: options.buyerAgencyId,
        purpose: options.purpose,
        currency: options.currency,
        amountCents: subtotal,
        taxCents: tax,
        status: InvoiceStatus.OPEN,
        dueAt: options.dueAt ?? this.defaultDueDate(),
        lines: {
          create: options.lines.map((line) => ({
            sku: line.sku,
            description: line.description,
            qty: line.qty,
            unitPriceCents: line.unitPriceCents,
            totalCents: line.unitPriceCents * line.qty,
            metaJson: line.meta ? line.meta : undefined
          }))
        }
      },
      include: { lines: true }
    });

    if (options.link?.promoBoostId) {
      await client.promoBoost.update({ where: { id: options.link.promoBoostId }, data: { invoiceId: invoice.id } });
    }

    if (options.link?.campaignId) {
      await client.adCampaign.update({ where: { id: options.link.campaignId }, data: { invoiceId: invoice.id } });
    }

    return invoice;
  }

  async createPaymentIntent(options: CreatePaymentIntentOptions) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: options.invoiceId }, include: { lines: true } });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException('Only open invoices can be paid');
    }

    const amountDue = invoice.amountCents + invoice.taxCents;
    const reference = this.buildReference(invoice.id);

    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        invoiceId: invoice.id,
        gateway: options.gateway,
        amountCents: amountDue,
        currency: invoice.currency,
        reference,
        status: PaymentIntentStatus.REQUIRES_ACTION
      }
    });

    const handler = this.registry.get(options.gateway);
    const returnUrl = options.returnUrl ?? env.PAYNOW_RETURN_URL;
    if (!returnUrl) {
      throw new BadRequestException('Missing return URL for payment gateway');
    }

    const description = `Invoice ${invoice.invoiceNo ?? invoice.id}`;
    const result = await handler.createIntent({
      invoiceId: invoice.id,
      amountCents: amountDue,
      currency: invoice.currency,
      reference,
      description,
      returnUrl
    });

    const updated = await this.prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        redirectUrl: result.redirectUrl,
        gatewayRef: result.gatewayReference ?? null,
        status: result.status ?? PaymentIntentStatus.REQUIRES_ACTION
      }
    });

    return { id: updated.id, redirectUrl: updated.redirectUrl };
  }

  async markIntentProcessing(id: string) {
    const intent = await this.prisma.paymentIntent.findUnique({ where: { id } });
    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }

    if (intent.status === PaymentIntentStatus.PROCESSING) {
      return intent;
    }

    if (intent.status !== PaymentIntentStatus.REQUIRES_ACTION) {
      throw new BadRequestException('Intent can no longer transition to processing');
    }

    return this.prisma.paymentIntent.update({ where: { id }, data: { status: PaymentIntentStatus.PROCESSING } });
  }

  async handlePaynowWebhook(body: Record<string, string>) {
    const handler = this.registry.get(PaymentGateway.PAYNOW);
    const result = await handler.verifyWebhook(body);

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { reference: result.reference },
      include: {
        invoice: {
          include: {
            lines: true,
            buyerUser: true,
            buyerAgency: true,
            promoBoost: true,
            campaign: { include: { flights: true } }
          }
        }
      }
    });

    if (!intent) {
      throw new NotFoundException('Payment intent for webhook not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: result.success ? PaymentIntentStatus.SUCCEEDED : PaymentIntentStatus.FAILED,
          gatewayRef: intent.gatewayRef ?? result.externalRef ?? null
        }
      });

      await tx.transaction.create({
        data: {
          invoiceId: intent.invoiceId,
          gateway: intent.gateway,
          externalRef: result.externalRef || result.reference,
          amountCents: result.amountCents,
          currency: result.currency,
          feeCents: result.feeCents ?? 0,
          netCents: result.amountCents - (result.feeCents ?? 0),
          result: result.success ? TransactionResult.SUCCESS : TransactionResult.FAILED,
          rawWebhookJson: result.rawPayload ?? undefined
        }
      });

      if (result.success) {
        await this.finalizeInvoice(tx, intent.invoice);
      }
    });
  }

  async markInvoicePaidOffline(options: OfflinePaymentOptions) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: options.invoiceId },
      include: {
        lines: true,
        buyerUser: true,
        buyerAgency: true,
        promoBoost: true,
        campaign: { include: { flights: true } }
      }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException('Invoice cannot be manually settled');
    }

    const paidAt = options.paidAt ?? new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          invoiceId: invoice.id,
          gateway: PaymentGateway.OFFLINE,
          externalRef: `MANUAL-${paidAt.getTime()}`,
          amountCents: options.amountCents,
          currency: invoice.currency,
          feeCents: 0,
          netCents: options.amountCents,
          result: TransactionResult.SUCCESS,
          rawWebhookJson: options.notes ? { notes: options.notes } : undefined
        }
      });

      await this.finalizeInvoice(tx, invoice);
    });

    await this.audit.log({
      action: 'invoice.manualPaid',
      actorId: options.actorId,
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: { amountCents: options.amountCents, notes: options.notes }
    });

    return this.prisma.invoice.findUnique({ where: { id: invoice.id }, include: { lines: true } });
  }

  private async finalizeInvoice(tx: PrismaTx, invoice: Invoice & {
    lines: InvoiceLine[];
    buyerUser?: { name?: string | null; email?: string | null } | null;
    buyerAgency?: { name: string } | null;
    promoBoost?: { id: string; startAt: Date; endAt: Date } | null;
    campaign?: { id: string; status: string; startAt: Date; flights: { id: string; placementId: string }[] } | null;
  }) {
    if (invoice.status === InvoiceStatus.PAID) {
      return;
    }

    const issuedAt = new Date();
    const invoiceNo = invoice.invoiceNo ?? this.generateInvoiceNumber(invoice, issuedAt);
    const pdfUrl = await this.generateInvoicePdf({ ...invoice, invoiceNo, issuedAt });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        issuedAt,
        invoiceNo,
        pdfUrl
      }
    });

    if (invoice.promoBoost) {
      await this.activatePromo(tx, invoice.promoBoost, issuedAt);
    }

    if (invoice.campaign) {
      await this.activateCampaign(tx, invoice.campaign, issuedAt);
    }
  }

  private async activateCampaign(
    tx: PrismaTx,
    campaign: { id: string; flights: { id: string; placementId: string }[] },
    activatedAt: Date
  ) {
    await tx.adCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'ACTIVE',
        startAt: activatedAt
      }
    });

    for (const flight of campaign.flights) {
      await tx.adStat.upsert({
        where: {
          campaignId_flightId_placementId_date: {
            campaignId: campaign.id,
            flightId: flight.id,
            placementId: flight.placementId,
            date: startOfDay(activatedAt)
          }
        },
        update: {},
        create: {
          campaignId: campaign.id,
          flightId: flight.id,
          placementId: flight.placementId,
          date: startOfDay(activatedAt),
          impressions: 0,
          clicks: 0,
          revenueMicros: 0
        }
      });
    }
  }

  private async activatePromo(
    tx: PrismaTx,
    promo: { id: string; startAt: Date; endAt: Date },
    activatedAt: Date
  ) {
    const endAt = promo.endAt > activatedAt ? promo.endAt : new Date(activatedAt.getTime() + 7 * 24 * 3600 * 1000);

    await tx.promoBoost.update({
      where: { id: promo.id },
      data: {
        startAt: activatedAt,
        endAt
      }
    });
  }

  private defaultDueDate() {
    const now = new Date();
    return new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  }

  private buildReference(invoiceId: string) {
    return `INV-${invoiceId}-${Date.now()}`;
  }

  private generateInvoiceNumber(invoice: Invoice, issuedAt: Date) {
    const year = issuedAt.getFullYear();
    const suffix = invoice.id.slice(-6).toUpperCase();
    return `PP-${year}-${suffix}`;
  }

  private async generateInvoicePdf(invoice: Invoice & { lines: InvoiceLine[]; invoiceNo: string; issuedAt: Date }) {
    return new Promise<string>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk as Buffer));
      doc.on('error', (err) => reject(err));
      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(`data:application/pdf;base64,${buffer.toString('base64')}`);
      });

      doc.fontSize(20).text('Propad Tax Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNo}`);
      doc.text(`Issued At: ${invoice.issuedAt.toISOString()}`);
      doc.moveDown();

      doc.text(`Subtotal: ${(invoice.amountCents / 100).toFixed(2)} ${invoice.currency}`);
      doc.text(`VAT: ${(invoice.taxCents / 100).toFixed(2)} ${invoice.currency}`);
      doc.text(`Total: ${((invoice.amountCents + invoice.taxCents) / 100).toFixed(2)} ${invoice.currency}`);
      doc.moveDown();

      doc.fontSize(14).text('Line Items');
      doc.moveDown(0.5);
      doc.fontSize(12);
      invoice.lines.forEach((line) => {
        doc.text(`${line.qty} x ${line.description} @ ${(line.unitPriceCents / 100).toFixed(2)} ${invoice.currency}`);
        doc.text(`Total: ${(line.totalCents / 100).toFixed(2)} ${invoice.currency}`);
        doc.moveDown(0.5);
      });

      doc.end();
    });
  }
}

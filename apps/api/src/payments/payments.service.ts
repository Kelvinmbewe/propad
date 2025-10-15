import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Currency,
  FxRate,
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
import { MailService } from '../mail/mail.service';

const VAT_SCALE = 100;
const MICRO_SCALE = 1_000_000;
const BASE_CURRENCY = Currency.USD;

type PrismaTx = Prisma.TransactionClient;

type InvoiceWithRelations = Invoice & {
  lines: InvoiceLine[];
  buyerUser?: { name?: string | null; email?: string | null } | null;
  buyerAgency?: { name: string; email?: string | null } | null;
  promoBoost?: { id: string; startAt: Date; endAt: Date } | null;
  campaign?: { id: string; status: string; startAt: Date; flights: { id: string; placementId: string }[] } | null;
  fxRate?: FxRate | null;
};

type TransactionSummary = {
  id: string;
  amountCents: number;
  currency: Currency;
  externalRef: string;
  gateway: PaymentGateway;
  createdAt: Date;
};

type InvoiceLineInput = {
  sku: string;
  description: string;
  qty: number;
  unitPriceCents: number;
  meta?: Record<string, unknown>;
  taxable?: boolean;
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
  private readonly vatRate = env.VAT_RATE ?? (env.VAT_PERCENT ?? 15) / VAT_SCALE;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly registry: PaymentGatewayRegistry,
    private readonly mail: MailService
  ) {}

  async createInvoice(options: CreateInvoiceOptions, tx?: PrismaTx) {
    const client = tx ?? this.prisma;

    if (options.lines.length === 0) {
      throw new BadRequestException('Invoice requires at least one line item');
    }

    const subtotalUsd = options.lines.reduce((acc, line) => acc + line.qty * line.unitPriceCents, 0);
    const taxableSubtotalUsd = options.lines.reduce(
      (acc, line) => (line.taxable ? acc + line.qty * line.unitPriceCents : acc),
      0
    );
    const taxUsd = Math.round(taxableSubtotalUsd * this.vatRate);

    let fxRate: FxRate | null = null;
    if (options.currency === Currency.ZWG) {
      fxRate = await this.resolveFxRate(client, BASE_CURRENCY, Currency.ZWG, new Date());
    } else if (options.currency !== BASE_CURRENCY) {
      throw new BadRequestException('Unsupported invoice currency');
    }

    const rateMicros = fxRate?.rateMicros;
    const convert = (value: number) => this.convertUsdCents(value, rateMicros);

    const invoice = await client.invoice.create({
      data: {
        buyerUserId: options.buyerUserId,
        buyerAgencyId: options.buyerAgencyId,
        purpose: options.purpose,
        currency: options.currency,
        amountCents: convert(subtotalUsd),
        taxCents: convert(taxUsd),
        amountUsdCents: subtotalUsd,
        taxUsdCents: taxUsd,
        status: InvoiceStatus.OPEN,
        dueAt: options.dueAt ?? this.defaultDueDate(),
        fxRate: fxRate ? { connect: { id: fxRate.id } } : undefined,
        lines: {
          create: options.lines.map((line) => {
            const baseUnit = line.unitPriceCents;
            const baseTotal = baseUnit * line.qty;
            const convertedUnit = convert(baseUnit);
            const convertedTotal = convert(baseTotal);
            const meta: Record<string, unknown> = {
              baseCurrency: BASE_CURRENCY,
              baseUnitPriceCents: baseUnit,
              baseTotalCents: baseTotal,
              taxable: line.taxable ?? false,
              ...(line.meta ?? {})
            };

            return {
              sku: line.sku,
              description: line.description,
              qty: line.qty,
              unitPriceCents: convertedUnit,
              totalCents: convertedTotal,
              metaJson: meta
            };
          })
        }
      },
      include: { lines: true, fxRate: true }
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
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: options.invoiceId },
      include: { lines: true, fxRate: true }
    });
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
            campaign: { include: { flights: true } },
            fxRate: true
          }
        }
      }
    });

    if (!intent) {
      throw new NotFoundException('Payment intent for webhook not found');
    }

    let receiptContext: { invoice: InvoiceWithRelations; transaction: TransactionSummary } | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: intent.id },
        data: {
          status: result.success ? PaymentIntentStatus.SUCCEEDED : PaymentIntentStatus.FAILED,
          gatewayRef: intent.gatewayRef ?? result.externalRef ?? null
        }
      });

      const transaction = await tx.transaction.create({
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
        const updatedInvoice = await this.finalizeInvoice(tx, intent.invoice);
        receiptContext = {
          invoice: updatedInvoice,
          transaction: {
            id: transaction.id,
            amountCents: transaction.amountCents,
            currency: transaction.currency,
            externalRef: transaction.externalRef,
            gateway: transaction.gateway,
            createdAt: transaction.createdAt
          }
        };
      }
    });

    if (receiptContext) {
      await this.deliverPaymentReceipt(receiptContext.invoice, receiptContext.transaction);
    }
  }

  async markInvoicePaidOffline(options: OfflinePaymentOptions) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: options.invoiceId },
      include: {
        lines: true,
        buyerUser: true,
        buyerAgency: true,
        promoBoost: true,
        campaign: { include: { flights: true } },
        fxRate: true
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

    let receiptContext: { invoice: InvoiceWithRelations; transaction: TransactionSummary } | null = null;

    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
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

      const updatedInvoice = await this.finalizeInvoice(tx, invoice);
      receiptContext = {
        invoice: updatedInvoice,
        transaction: {
          id: transaction.id,
          amountCents: transaction.amountCents,
          currency: transaction.currency,
          externalRef: transaction.externalRef,
          gateway: transaction.gateway,
          createdAt: transaction.createdAt
        }
      };
    });

    await this.audit.log({
      action: 'invoice.manualPaid',
      actorId: options.actorId,
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: { amountCents: options.amountCents, notes: options.notes }
    });

    if (receiptContext) {
      await this.deliverPaymentReceipt(receiptContext.invoice, receiptContext.transaction);
      return receiptContext.invoice;
    }

    return this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { lines: true, fxRate: true }
    });
  }

  private async finalizeInvoice(tx: PrismaTx, invoice: InvoiceWithRelations) {
    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    const issuedAt = new Date();
    const invoiceNo = invoice.invoiceNo ?? this.generateInvoiceNumber(invoice, issuedAt);
    const pdfUrl = await this.generateInvoicePdf({ ...invoice, invoiceNo, issuedAt });

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        issuedAt,
        invoiceNo,
        pdfUrl
      },
      include: {
        lines: true,
        buyerUser: true,
        buyerAgency: true
      }
    });

    if (invoice.promoBoost) {
      await this.activatePromo(tx, invoice.promoBoost, issuedAt);
    }

    if (invoice.campaign) {
      await this.activateCampaign(tx, invoice.campaign, issuedAt);
    }

    return { ...updated, promoBoost: invoice.promoBoost, campaign: invoice.campaign } as InvoiceWithRelations;
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

  private convertUsdCents(usdCents: number, rateMicros?: number) {
    if (!rateMicros) {
      return usdCents;
    }

    return Math.round((usdCents * rateMicros) / MICRO_SCALE);
  }

  private async resolveFxRate(client: PrismaTx, base: Currency, quote: Currency, at: Date) {
    const targetDate = startOfDay(at);
    const rate = await client.fxRate.findFirst({
      where: {
        base,
        quote,
        date: { lte: at }
      },
      orderBy: { date: 'desc' }
    });

    if (!rate) {
      throw new BadRequestException(`No FX rate configured for ${base}/${quote} on or before ${targetDate.toISOString()}`);
    }

    return rate;
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

  private async deliverPaymentReceipt(invoice: InvoiceWithRelations, transaction: TransactionSummary) {
    const pdfUrl = await this.generatePaymentReceiptPdf(invoice, transaction);
    await this.prisma.transaction.update({ where: { id: transaction.id }, data: { receiptPdfUrl: pdfUrl } });

    const recipient = invoice.buyerUser?.email ?? invoice.buyerAgency?.email ?? null;
    if (!recipient) {
      return;
    }

    const amountPaid = (transaction.amountCents / 100).toFixed(2);
    const totalUsd = ((invoice.amountUsdCents + invoice.taxUsdCents) / 100).toFixed(2);
    const amountPaidMessage =
      invoice.currency === Currency.ZWG
        ? `${amountPaid} ${transaction.currency} (USD ${totalUsd})`
        : `${amountPaid} ${transaction.currency}`;
    const rateNote =
      invoice.currency === Currency.ZWG && invoice.fxRate
        ? ` at an exchange rate of 1 ${invoice.fxRate.base} = ${(invoice.fxRate.rateMicros / MICRO_SCALE).toFixed(6)} ${invoice.fxRate.quote}`
        : '';
    const invoiceLabel = invoice.invoiceNo ?? invoice.id;
    const recipientName = invoice.buyerUser?.name ?? invoice.buyerAgency?.name ?? 'Valued customer';

    await this.mail.send({
      to: recipient,
      subject: `Receipt for invoice ${invoiceLabel}`,
      text: `Hi ${recipientName},\n\nThank you for your payment of ${amountPaidMessage} for invoice ${invoiceLabel}${rateNote}. Your receipt is attached for your records.\n\n-- Propad`,
      filename: `receipt-${invoiceLabel}.pdf`,
      pdfDataUrl: pdfUrl
    });
  }

  private async generatePaymentReceiptPdf(invoice: InvoiceWithRelations, transaction: TransactionSummary) {
    return new Promise<string>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk as Buffer));
      doc.on('error', (err) => reject(err));
      doc.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(`data:application/pdf;base64,${buffer.toString('base64')}`);
      });

      doc.fontSize(20).text('Propad Payment Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNo ?? invoice.id}`);
      doc.text(`Transaction Reference: ${transaction.externalRef}`);
      doc.text(`Payment Date: ${transaction.createdAt.toISOString()}`);
      doc.text(`Gateway: ${transaction.gateway}`);
      doc.text(`Amount Paid: ${(transaction.amountCents / 100).toFixed(2)} ${transaction.currency}`);
      doc.moveDown();
      doc.text(`Subtotal: ${(invoice.amountCents / 100).toFixed(2)} ${invoice.currency}`);
      doc.text(`VAT: ${(invoice.taxCents / 100).toFixed(2)} ${invoice.currency}`);
      doc.text(`Total: ${((invoice.amountCents + invoice.taxCents) / 100).toFixed(2)} ${invoice.currency}`);
      if (invoice.currency === Currency.ZWG) {
        doc.text(`Subtotal (USD): ${(invoice.amountUsdCents / 100).toFixed(2)} USD`);
        doc.text(`VAT (USD): ${(invoice.taxUsdCents / 100).toFixed(2)} USD`);
        doc.text(
          `Total (USD): ${((invoice.amountUsdCents + invoice.taxUsdCents) / 100).toFixed(2)} USD`
        );
        if (invoice.fxRate) {
          doc.text(
            `Exchange Rate: 1 ${invoice.fxRate.base} = ${(invoice.fxRate.rateMicros / MICRO_SCALE).toFixed(6)} ${invoice.fxRate.quote}`
          );
        }
      }
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

  private async generateInvoicePdf(
    invoice: Invoice & { lines: InvoiceLine[]; invoiceNo: string; issuedAt: Date; fxRate?: FxRate | null }
  ) {
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
      if (invoice.currency === Currency.ZWG) {
        doc.text(`Subtotal (USD): ${(invoice.amountUsdCents / 100).toFixed(2)} USD`);
        doc.text(`VAT (USD): ${(invoice.taxUsdCents / 100).toFixed(2)} USD`);
        doc.text(
          `Total (USD): ${((invoice.amountUsdCents + invoice.taxUsdCents) / 100).toFixed(2)} USD`
        );
        if (invoice.fxRate) {
          doc.text(
            `Exchange Rate: 1 ${invoice.fxRate.base} = ${(invoice.fxRate.rateMicros / MICRO_SCALE).toFixed(6)} ${invoice.fxRate.quote}`
          );
        }
      }
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

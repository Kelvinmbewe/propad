import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InvoicePurpose, InvoiceStatus, Currency } from "@prisma/client";

@Injectable()
export class AdsInvoicesService {
  constructor(private prisma: PrismaService) {}

  async createTopUpInvoice(advertiserId: string, amountCents: number) {
    return this.prisma.invoice.create({
      data: {
        advertiserId,
        purpose: InvoicePurpose.OTHER,
        currency: Currency.USD,
        amountCents,
        taxCents: 0,
        amountUsdCents: amountCents,
        taxUsdCents: 0,
        status: InvoiceStatus.PAID, // Immediate payment for topups
        issuedAt: new Date(),
        lines: {
          create: {
            description: "Ad Credit Top Up",
            sku: "AD_TOPUP",
            quantity: 1,
            unitPriceCents: amountCents,
            totalCents: amountCents,
          },
        },
      } as any,
    });
  }

  async createTopUpInvoiceOpen(params: {
    advertiserId: string;
    buyerUserId?: string;
    amountCents: number;
    currency?: Currency;
  }) {
    const currency = params.currency ?? Currency.USD;
    return this.prisma.invoice.create({
      data: {
        advertiserId: params.advertiserId,
        buyerUserId: params.buyerUserId,
        purpose: InvoicePurpose.OTHER,
        currency,
        amountCents: params.amountCents,
        taxCents: 0,
        amountUsdCents: params.amountCents,
        taxUsdCents: 0,
        status: InvoiceStatus.OPEN,
        issuedAt: null,
        lines: {
          create: {
            description: "Ad Credit Top Up",
            sku: "AD_TOPUP",
            quantity: 1,
            unitPriceCents: params.amountCents,
            totalCents: params.amountCents,
            metaJson: {
              adTopup: true,
              advertiserId: params.advertiserId,
            },
          },
        },
      } as any,
    });
  }

  async createCampaignInvoice(campaign: {
    id: string;
    advertiserId: string;
    budgetCents: number | null;
  }) {
    const amountCents = campaign.budgetCents || 0;
    return this.prisma.invoice.create({
      data: {
        advertiserId: campaign.advertiserId,
        purpose: "DIRECT_AD" as any,
        currency: Currency.USD,
        amountCents,
        taxCents: 0,
        amountUsdCents: amountCents,
        taxUsdCents: 0,
        status: InvoiceStatus.PAID, // Considered Paid as it draws from confirmed balance/usage
        issuedAt: new Date(),
        campaign: { connect: { id: campaign.id } },
        lines: {
          create: {
            description: `Campaign Budget: ${amountCents > 0 ? (amountCents / 100).toFixed(2) : "Pay-as-you-go"}`,
            sku: "AD_CAMPAIGN",
            quantity: 1,
            unitPriceCents: amountCents,
            totalCents: amountCents,
          },
        },
      } as any,
    });
  }

  async getMyInvoices(advertiserId: string) {
    return this.prisma.invoice.findMany({
      where: { advertiserId },
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });
  }

  async getInvoice(id: string, advertiserId: string) {
    return this.prisma.invoice.findFirst({
      where: { id, advertiserId },
      include: { lines: true },
    });
  }
}

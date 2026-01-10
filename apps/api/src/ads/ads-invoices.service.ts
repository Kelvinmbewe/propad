import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicePurpose, InvoiceStatus, Currency } from '@prisma/client';

@Injectable()
export class AdsInvoicesService {
    constructor(private prisma: PrismaService) { }

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
                        description: 'Ad Credit Top Up',
                        amountCents,
                        quantity: 1,
                        unitPriceCents: amountCents
                    }
                }
            }
        });
    }

    async createCampaignInvoice(campaign: { id: string; advertiserId: string; budgetCents: number | null }) {
        const amountCents = campaign.budgetCents || 0;
        return this.prisma.invoice.create({
            data: {
                advertiserId: campaign.advertiserId,
                purpose: InvoicePurpose.DIRECT_AD,
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
                        description: `Campaign Budget: ${amountCents > 0 ? (amountCents / 100).toFixed(2) : 'Pay-as-you-go'}`,
                        amountCents,
                        quantity: 1,
                        unitPriceCents: amountCents
                    }
                }
            }
        });
    }

    async getMyInvoices(advertiserId: string) {
        return this.prisma.invoice.findMany({
            where: { advertiserId },
            orderBy: { createdAt: 'desc' },
            include: { lines: true }
        });
    }

    async getInvoice(id: string, advertiserId: string) {
        return this.prisma.invoice.findFirst({
            where: { id, advertiserId },
            include: { lines: true }
        });
    }
}

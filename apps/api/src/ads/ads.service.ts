import { Injectable } from '@nestjs/common';
import { env } from '@propad/config';
import { AdCampaignStatus, InvoicePurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdImpressionDto } from './dto/create-ad-impression.dto';
import { PaymentsService } from '../payments/payments.service';
import { CreateDirectAdDto } from './dto/create-direct-ad.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly audit: AuditService
  ) {}

  async logImpression(payload: CreateAdImpressionDto) {
    const estimatedRevenue =
      payload.revenueMicros ??
      this.simulateRevenueMicros(payload.route, payload.sessionId);

    return this.prisma.adImpression.create({
      data: {
        propertyId: payload.propertyId,
        userId: payload.userId,
        route: payload.route,
        source: payload.source,
        sessionId: payload.sessionId,
        revenueMicros: estimatedRevenue
      }
    });
  }

  private simulateRevenueMicros(route: string, sessionId: string) {
    if (process.env.NODE_ENV === 'production') {
      return 0;
    }

    const hashInput = `${route}:${sessionId}:${env.WEB_ORIGIN ?? 'dev'}`;
    let hash = 0;
    for (let i = 0; i < hashInput.length; i += 1) {
      hash = (hash << 5) - hash + hashInput.charCodeAt(i);
      hash |= 0;
    }

    const base = 200_000;
    const variance = Math.abs(hash) % 120_000;
    return base + variance;
  }

  async createDirectCampaign(actorId: string, dto: CreateDirectAdDto) {
    const { campaign, invoice } = await this.prisma.$transaction(async (tx) => {
      const createdCampaign = await tx.adCampaign.create({
        data: {
          advertiserId: dto.advertiserId,
          name: dto.name,
          startAt: dto.startAt,
          endAt: dto.endAt,
          status: AdCampaignStatus.DRAFT,
          dailyCapImpressions: dto.dailyCapImpressions ?? null
        }
      });

      await tx.adFlight.create({
        data: {
          campaignId: createdCampaign.id,
          creativeId: dto.creativeId,
          placementId: dto.placementId
        }
      });

      const createdInvoice = await this.payments.createInvoice(
        {
          buyerUserId: dto.buyerUserId,
          buyerAgencyId: dto.buyerAgencyId,
          purpose: InvoicePurpose.DIRECT_AD,
          currency: dto.currency,
          lines: [
            {
              sku: 'AD_DIRECT',
              description: `Direct ad campaign ${dto.name}`,
              qty: 1,
              unitPriceCents: dto.totalCents,
              taxable: true
            }
          ],
          link: { campaignId: createdCampaign.id }
        },
        tx
      );

      return { campaign: createdCampaign, invoice: createdInvoice };
    });

    await this.audit.log({
      action: 'ad.campaign.create',
      actorId,
      targetType: 'adCampaign',
      targetId: campaign.id,
      metadata: { invoiceId: invoice.id }
    });

    return { campaign, invoice };
  }
}

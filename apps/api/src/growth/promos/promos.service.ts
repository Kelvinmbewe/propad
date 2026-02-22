import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WalletLedgerService } from "../../wallets/wallet-ledger.service";
import { WalletLedgerType, WalletLedgerSourceType } from "../../wallet/enums";

@Injectable()
export class PromosService {
  private readonly logger = new Logger(PromosService.name);

  constructor(
    private prisma: PrismaService,
    private ledgerService: WalletLedgerService,
  ) {}

  async redeemCode(userId: string, code: string) {
    // Note: promoCode and promoUsage models don't exist in schema
    // For now, this is a simplified version that validates codes against AppConfig
    this.logger.warn(
      `promoCode model not found in schema, using AppConfig instead`,
    );

    const promoConfig = await this.prisma.appConfig.findUnique({
      where: { key: `PROMO_${code}` },
    });

    if (!promoConfig) {
      throw new BadRequestException("Invalid code");
    }

    const promo = promoConfig.jsonValue as any;

    if (!promo || !promo.active) {
      throw new BadRequestException("Invalid or inactive code");
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      throw new BadRequestException("Code expired");
    }
    // Note: Max uses tracking not available without promoUsage model

    // Processing
    if (promo.type === "CREDIT") {
      const wallet = await this.prisma.wallet.findFirst({
        where: { ownerId: userId },
      });
      if (!wallet) throw new BadRequestException("No wallet found");

      await this.ledgerService.recordTransaction(
        userId,
        promo.value,
        WalletLedgerType.CREDIT,
        WalletLedgerSourceType.REWARD,
        `PROMO-${code}-${userId}`,
        wallet.currency,
        wallet.id,
      );
    }

    // Note: Usage tracking not available without promoUsage model

    return {
      success: true,
      message: `Redeemed ${promo.value / 100} ${promo.type}`,
    };
  }
}

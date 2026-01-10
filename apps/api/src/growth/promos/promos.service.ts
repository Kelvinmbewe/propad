import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletLedgerService } from '../../wallets/wallet-ledger.service';
import { WalletLedgerType, WalletLedgerSourceType } from '../../wallet/enums';

@Injectable()
export class PromosService {
    constructor(
        private prisma: PrismaService,
        private ledgerService: WalletLedgerService
    ) { }

    async redeemCode(userId: string, code: string) {
        const promo = await this.prisma.promoCode.findUnique({ where: { code } });

        if (!promo || !promo.active) {
            throw new BadRequestException('Invalid or inactive code');
        }
        if (promo.expiresAt && promo.expiresAt < new Date()) {
            throw new BadRequestException('Code expired');
        }
        if (promo.maxUses && promo.usedCount >= promo.maxUses) {
            throw new BadRequestException('Code fully redeemed');
        }

        const usage = await this.prisma.promoUsage.findUnique({
            where: { userId_promoCodeId: { userId, promoCodeId: promo.id } }
        });
        if (usage) {
            throw new BadRequestException('You have already used this code');
        }

        // Processing
        if (promo.type === 'CREDIT') {
            const wallet = await this.prisma.wallet.findFirst({ where: { ownerId: userId } });
            if (!wallet) throw new BadRequestException('No wallet found');

            await this.ledgerService.recordTransaction(
                userId,
                promo.value,
                WalletLedgerType.CREDIT,
                WalletLedgerSourceType.REWARD, // or PROMO specific source if existing
                `PROMO-${code}-${userId}`,
                wallet.currency,
                wallet.id
            );
        }

        // Record Usage
        await this.prisma.$transaction([
            this.prisma.promoUsage.create({
                data: { userId, promoCodeId: promo.id }
            }),
            this.prisma.promoCode.update({
                where: { id: promo.id },
                data: { usedCount: { increment: 1 } }
            })
        ]);

        return { success: true, message: `Redeemed ${promo.value / 100} ${promo.type}` };
    }
}

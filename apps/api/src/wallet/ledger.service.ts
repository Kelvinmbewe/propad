import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency } from '@prisma/client';
import { WalletLedgerType, WalletLedgerSourceType } from './enums';

@Injectable()
export class LedgerService {
    constructor(private prisma: PrismaService) { }

    async recordTransaction(
        userId: string,
        amountCents: number,
        type: WalletLedgerType,
        sourceType: WalletLedgerSourceType,
        sourceId: string,
        currency: Currency = Currency.USD,
        walletId?: string,
    ) {
        return this.prisma.$transaction(async (tx) => {
            // Create ledger entry
            const entry = await tx.walletLedger.create({
                data: {
                    userId,
                    amountCents,
                    type,
                    sourceType,
                    sourceId,
                    currency,
                    walletId,
                },
            });

            // Update wallet balance if walletId is provided
            if (walletId) {
                const adjustment = type === WalletLedgerType.CREDIT ? amountCents : -amountCents;
                await tx.wallet.update({
                    where: { id: walletId },
                    data: {
                        balanceCents: {
                            increment: adjustment,
                        },
                    },
                });
            }

            return entry;
        });
    }
}

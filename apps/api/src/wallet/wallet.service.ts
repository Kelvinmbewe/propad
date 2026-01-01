import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, OwnerType } from '@prisma/client';

@Injectable()
export class WalletService {
    constructor(private prisma: PrismaService) { }

    async getOrCreateWallet(ownerId: string, ownerType: OwnerType, currency: Currency = Currency.USD) {
        let wallet = await this.prisma.wallet.findUnique({
            where: {
                ownerType_ownerId_currency: {
                    ownerId,
                    ownerType,
                    currency,
                },
            },
        });

        if (!wallet) {
            wallet = await this.prisma.wallet.create({
                data: {
                    ownerId,
                    ownerType,
                    currency,
                    balanceCents: 0,
                    pendingCents: 0,
                },
            });
        }

        return wallet;
    }

    async getBalance(ownerId: string, ownerType: OwnerType, currency: Currency = Currency.USD) {
        const wallet = await this.getOrCreateWallet(ownerId, ownerType, currency);
        return wallet.balanceCents;
    }
}

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, OwnerType, WalletLedgerSourceType, WalletLedgerType } from '@prisma/client';
import { WalletLedgerService } from '../wallets/wallet-ledger.service';

@Injectable()
export class WalletService {
    constructor(
        private prisma: PrismaService,
        private ledger: WalletLedgerService
    ) { }

    async processTransaction(
        userId: string,
        amountCents: number,
        type: 'CREDIT' | 'DEBIT',
        sourceType: string,
        sourceId: string,
        description: string,
        currency: Currency = Currency.USD
    ) {
        if (amountCents <= 0) throw new BadRequestException('Amount must be positive');

        // Check if transaction already exists (Idempotency)
        // We can check ledger directly
        const existingEntries = await this.ledger.getLedgerEntries(userId, currency, 1);
        // This is a weak check, ideally we search by sourceId.
        // Let's use prisma directly for check or add findBySource to LedgerService?
        // Check manually for now
        const existing = await this.prisma.walletLedger.findFirst({
            where: {
                userId,
                sourceType: sourceType as any,
                sourceId
            }
        });

        if (existing) {
            // Return current wallet state if idempotent
            return this.getOrCreateWallet(userId, OwnerType.USER, currency);
        }

        if (type === 'DEBIT') {
            await this.ledger.debit(
                userId,
                amountCents,
                currency,
                sourceType as WalletLedgerSourceType,
                sourceId,
                description
            );
        } else {
            await this.ledger.credit(
                userId,
                amountCents,
                currency,
                sourceType as WalletLedgerSourceType,
                sourceId,
                description
            );
        }

        return this.getOrCreateWallet(userId, OwnerType.USER, currency);
    }

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
                    balanceCents: 0, // Legacy field, will be ignored
                    pendingCents: 0,
                },
            });
        }

        // Calculate real balance
        if (ownerType === OwnerType.USER) {
            const balance = await this.ledger.calculateBalance(ownerId, currency);
            return {
                ...wallet,
                balanceCents: balance.balanceCents,
                pendingCents: balance.pendingCents
            };
        }

        return wallet;
    }

    async getBalance(ownerId: string, ownerType: OwnerType, currency: Currency = Currency.USD) {
        if (ownerType === OwnerType.USER) {
            const balance = await this.ledger.calculateBalance(ownerId, currency);
            return balance.balanceCents;
        }
        // Fallback or Error for other types?
        const wallet = await this.getOrCreateWallet(ownerId, ownerType, currency);
        return wallet.balanceCents;
    }
}

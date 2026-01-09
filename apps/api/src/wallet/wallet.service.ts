import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Currency, OwnerType } from '@prisma/client';

@Injectable()
export class WalletService {
    constructor(private prisma: PrismaService) { }

    async processTransaction(
        userId: string,
        amountCents: number,
        type: 'CREDIT' | 'DEBIT',
        sourceType: string,
        sourceId: string,
        description: string,
        currency: Currency = Currency.USD
    ) {
        if (amountCents <= 0) throw new Error('Amount must be positive');

        return this.prisma.$transaction(async (tx) => {
            // 1. Get Wallet (Locked for Update ideally, but simple select first)
            const wallet = await this.getOrCreateWallet(userId, 'USER', currency);

            // 2. Check Balance for DEBIT
            if (type === 'DEBIT' && wallet.balanceCents < amountCents) {
                throw new Error('Insufficient funds');
            }

            // 3. Create Ledger Entry
            // Idempotency check: Ensure same source doesn't process twice
            const existingEntry = await tx.walletLedger.findFirst({
                where: { sourceType: sourceType as any, sourceId }
            });

            if (existingEntry) {
                // Idempotent return if already processed
                return wallet;
            }

            const ledgerEntry = await tx.walletLedger.create({
                data: {
                    userId,
                    walletId: wallet.id,
                    type: type as any,
                    sourceType: sourceType as any,
                    sourceId,
                    amountCents,
                    currency,
                }
            });

            // 4. Update Balance
            const newBalance = type === 'CREDIT'
                ? wallet.balanceCents + amountCents
                : wallet.balanceCents - amountCents;

            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balanceCents: newBalance
                }
            });

            return updatedWallet;
        });
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

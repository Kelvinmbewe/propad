import type { KyInstance } from 'ky';

export interface WalletLedgerEntry {
    id: string;
    userId: string;
    type: 'CREDIT' | 'DEBIT' | 'HOLD' | 'RELEASE' | 'REFUND';
    sourceType: string;
    sourceId: string;
    amountCents: number;
    currency: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

export class WalletModule {
    constructor(private client: KyInstance) { }

    async getOverview() {
        return this.client.get('wallet/me').json<{
            balanceCents: number;
            pendingCents: number;
            withdrawableCents: number;
            currency: string;
        }>();
    }

    async getTransactions(params: { limit?: number; cursor?: string } = {}) {
        return this.client.get('wallet/transactions', {
            searchParams: params
        }).json<WalletLedgerEntry[]>();
    }
}

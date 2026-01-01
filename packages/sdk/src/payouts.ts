// Local type definitions matching Prisma schema
export type PayoutMethod = 'ECOCASH' | 'INNBUCKS' | 'BANK_TRANSFER';
export type PayoutStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface PayoutRequest {
    id: string;
    walletId: string;
    amountCents: number;
    method: PayoutMethod;
    accountId: string;
    status: PayoutStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface RequestPayoutParams {
    amountCents: number;
    method: PayoutMethod;
    accountId: string;
}

export class PayoutsClient {
    constructor(private client: any) { }

    async requestPayout(params: RequestPayoutParams): Promise<PayoutRequest> {
        return this.client.post('/payouts/request', { json: params }).json();
    }

    async getMyPayouts(): Promise<PayoutRequest[]> {
        return this.client.get('/payouts/my').json();
    }

    // Admin
    async getAllPayouts(): Promise<(PayoutRequest & { wallet: { user: any } })[]> {
        return this.client.get('/payouts/all').json();
    }

    async approvePayout(requestId: string): Promise<any> {
        return this.client.post(`/payouts/approve/${requestId}`).json();
    }
}

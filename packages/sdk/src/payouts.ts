// Note: PayoutMethod types here are for client use. Full PayoutRequest type is in schemas.ts
export type PayoutMethodType = 'ECOCASH' | 'INNBUCKS' | 'BANK_TRANSFER';
export type PayoutStatusType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface RequestPayoutParams {
    amountCents: number;
    method: PayoutMethodType;
    accountId: string;
}

export class PayoutsClient {
    constructor(private client: any) { }

    async requestPayout(params: RequestPayoutParams): Promise<any> {
        return this.client.post('/payouts/request', { json: params }).json();
    }

    async getMyPayouts(): Promise<any[]> {
        return this.client.get('/payouts/my').json();
    }

    // Admin
    async getAllPayouts(): Promise<any[]> {
        return this.client.get('/payouts/all').json();
    }

    async approvePayout(requestId: string): Promise<any> {
        return this.client.post(`/payouts/approve/${requestId}`).json();
    }
}

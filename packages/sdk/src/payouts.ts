import { AxiosInstance } from 'axios';
import { PayoutMethod, PayoutRequest, PayoutStatus } from '@prisma/client';

export interface RequestPayoutParams {
    amountCents: number;
    method: PayoutMethod;
    accountId: string;
}

export class PayoutsClient {
    constructor(private axios: AxiosInstance) { }

    async requestPayout(params: RequestPayoutParams): Promise<PayoutRequest> {
        const { data } = await this.axios.post('/payouts/request', params);
        return data;
    }

    async getMyPayouts(): Promise<PayoutRequest[]> {
        const { data } = await this.axios.get('/payouts/my');
        return data;
    }

    // Admin
    async getAllPayouts(): Promise<(PayoutRequest & { wallet: { user: any } })[]> {
        const { data } = await this.axios.get('/payouts/all');
        return data;
    }

    async approvePayout(requestId: string): Promise<any> {
        const { data } = await this.axios.post(`/payouts/approve/${requestId}`);
        return data;
    }
}

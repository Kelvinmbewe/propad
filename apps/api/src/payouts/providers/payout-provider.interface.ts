import { PayoutMethod, PayoutRequest } from '@prisma/client';

export interface IPayoutProvider {
    canHandle(method: PayoutMethod): boolean;
    processPayout(request: PayoutRequest, accountDetails: any): Promise<{ transactionRef: string; status: string; metadata?: any }>;
}

import { PayoutMethod } from '@prisma/client';

export interface IPayoutProvider {
    canHandle(method: PayoutMethod): boolean;
    processPayout(request: any, accountDetails: any): Promise<{ transactionRef: string; status: string; metadata?: any }>;
}

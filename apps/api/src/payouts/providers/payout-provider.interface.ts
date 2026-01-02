import { PayoutRequest } from '@prisma/client';
import { PayoutMethod } from '../payout-method.enum';

export interface IPayoutProvider {
    canHandle(method: PayoutMethod): boolean;
    processPayout(request: PayoutRequest, accountDetails: any): Promise<{ transactionRef: string; status: string; metadata?: any }>;
}

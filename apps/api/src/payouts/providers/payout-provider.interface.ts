import { PayoutMethod } from '@propad/config';

export interface IPayoutProvider {
    canHandle(method: PayoutMethod): boolean;
    processPayout(request: any, accountDetails: any): Promise<{ transactionRef: string; status: string; metadata?: any }>;
}

import { Injectable, Logger } from '@nestjs/common';
import { PayoutMethod, PayoutRequest } from '@prisma/client';
import { IPayoutProvider } from './payout-provider.interface';

@Injectable()
export class ManualProvider implements IPayoutProvider {
    private readonly logger = new Logger(ManualProvider.name);

    canHandle(method: PayoutMethod): boolean {
        return method === PayoutMethod.CASH || method === PayoutMethod.OTHER;
    }

    async processPayout(request: PayoutRequest, accountDetails: any): Promise<{ transactionRef: string; status: string; metadata?: any }> {
        this.logger.log(`Processing Manual/Cash payout for ${request.id}`);

        return {
            transactionRef: `MANUAL-${Date.now()}`,
            status: 'PENDING',
            metadata: {
                notes: 'Cash collection or other manual method',
            },
        };
    }
}

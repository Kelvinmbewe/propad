import { Injectable, Logger } from '@nestjs/common';
import { PayoutMethod } from '@prisma/client';
import { IPayoutProvider } from './payout-provider.interface';

@Injectable()
export class PaynowProvider implements IPayoutProvider {
    private readonly logger = new Logger(PaynowProvider.name);

    canHandle(method: PayoutMethod): boolean {
        return method === PayoutMethod.ECOCASH || method === PayoutMethod.ONEMONEY;
    }

    async processPayout(request: any, accountDetails: any): Promise<{ transactionRef: string; status: string; metadata?: any }> {
        this.logger.log(`Processing Paynow payout for ${request.id} via ${request.method}`);
        // Simulate Paynow API call
        const mockRef = `PAYNOW-${Math.floor(Math.random() * 1000000)}`;
        return {
            transactionRef: mockRef,
            status: 'PROCESSING', // Paynow usually is async
            metadata: {
                provider: 'paynow',
                phone: accountDetails.ecocashNumber || accountDetails.phone,
            },
        };
    }
}

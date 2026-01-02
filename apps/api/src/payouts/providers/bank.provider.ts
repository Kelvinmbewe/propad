import { Injectable, Logger } from '@nestjs/common';
import { PayoutRequest } from '@prisma/client';
import { PayoutMethod } from '../../payout-method.enum';
import { IPayoutProvider } from './payout-provider.interface';

@Injectable()
export class BankProvider implements IPayoutProvider {
    private readonly logger = new Logger(BankProvider.name);

    canHandle(method: PayoutMethod): boolean {
        return method === PayoutMethod.BANK || method === PayoutMethod.BANK_TRANSFER || method === PayoutMethod.ZIPIT;
    }

    async processPayout(request: PayoutRequest, accountDetails: any): Promise<{ transactionRef: string; status: string; metadata?: any }> {
        this.logger.log(`Processing Bank payout for ${request.id}`);
        // Manual bank transfer usually requires admin to upload proof.
        // This provider might just mark it as "ready for processing" or "pending bank action".

        return {
            transactionRef: `BANK-${Date.now()}`,
            status: 'PENDING', // Requires manual completion
            metadata: {
                bankName: accountDetails.bankName,
                accountNumber: accountDetails.bankAccountNumber,
            },
        };
    }
}

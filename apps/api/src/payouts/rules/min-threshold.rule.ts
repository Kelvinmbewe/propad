import { Injectable, BadRequestException } from '@nestjs/common';
import { PayoutRequest } from '@prisma/client';
import { IPayoutRule } from './payout-rule.interface';

@Injectable()
export class MinThresholdRule implements IPayoutRule {
    private readonly MIN_AMOUNT_CENTS = 1000; // $10.00

    async validate(request: PayoutRequest): Promise<void> {
        if (request.amountCents < this.MIN_AMOUNT_CENTS) {
            throw new BadRequestException(`Payout amount must be at least $${this.MIN_AMOUNT_CENTS / 100}`);
        }
    }
}

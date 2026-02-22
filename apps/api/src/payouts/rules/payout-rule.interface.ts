import { PayoutRequest } from '@prisma/client';

export interface IPayoutRule {
    validate(request: PayoutRequest): Promise<void>;
}

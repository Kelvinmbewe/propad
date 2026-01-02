import { SetMetadata } from '@nestjs/common';
import { ChargeableItemType } from '@prisma/client';
import { PaymentRequiredMetadata } from '../guards/payment-required.guard';

export const PAYMENT_REQUIRED_KEY = 'paymentRequired';

export const PaymentRequired = (featureType: ChargeableItemType | string, featureIdParam?: string) =>
  SetMetadata<typeof PAYMENT_REQUIRED_KEY, PaymentRequiredMetadata>(PAYMENT_REQUIRED_KEY, {
    featureType: featureType as ChargeableItemType,
    featureIdParam: featureIdParam || 'id'
  });


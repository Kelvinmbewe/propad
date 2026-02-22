import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ChargeableItemType } from '@propad/config';
// import { ChargeableItemType } from '@prisma/client';
import { FeatureAccessService, FeatureAccessStatus } from '../feature-access.service';

export interface PaymentRequiredMetadata {
  featureType: ChargeableItemType;
  featureIdParam?: string; // e.g., 'id', 'propertyId', etc.
}

@Injectable()
export class PaymentRequiredGuard implements CanActivate {
  constructor(private readonly featureAccess: FeatureAccessService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string } | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Get metadata from decorator
    const handler = context.getHandler();
    const metadata: PaymentRequiredMetadata | undefined = Reflect.getMetadata(
      'paymentRequired',
      handler
    );

    if (!metadata) {
      // If no metadata, allow access (guard is optional)
      return true;
    }

    const { featureType, featureIdParam = 'id' } = metadata;
    const featureId = request.params[featureIdParam] || request.body[featureIdParam];

    if (!featureId) {
      throw new ForbiddenException(`Feature ID is required for ${featureType}`);
    }

    // Check feature access using FeatureAccessService
    const access = await this.featureAccess.checkAccess(user.userId, featureType, featureId);

    if (access.status === FeatureAccessStatus.FREE) {
      // Feature is free, allow access
      return true;
    }

    if (access.status === FeatureAccessStatus.GRANTED) {
      // Payment completed, allow access
      return true;
    }

    if (access.status === FeatureAccessStatus.REQUIRED) {
      // Payment required but not paid
      const price = access.pricingBreakdown
        ? `${(access.pricingBreakdown.totalCents / 100).toFixed(2)} ${access.pricingBreakdown.currency}`
        : 'payment';
      throw new ForbiddenException(
        `Payment required for ${featureType}. Amount: ${price}. Please complete payment before accessing this feature.`
      );
    }

    // EXPIRED or other status - deny access
    throw new ForbiddenException(
      `Access to ${featureType} is not available. Please contact support.`
    );
  }
}


import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ChargeableItemType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface PaymentRequiredMetadata {
  featureType: ChargeableItemType;
  featureIdParam?: string; // e.g., 'id', 'propertyId', etc.
}

@Injectable()
export class PaymentRequiredGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

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

    // Check for valid payment transaction
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: {
        userId: user.userId,
        featureType,
        featureId,
        status: PaymentStatus.PAID
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!payment) {
      throw new ForbiddenException(
        `Payment required for ${featureType}. Please complete payment before accessing this feature.`
      );
    }

    // Attach payment to request for use in handlers
    request.paymentTransaction = payment;

    return true;
  }
}


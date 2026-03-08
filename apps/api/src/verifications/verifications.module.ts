import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { VerificationsController } from "./verifications.controller";
import { VerificationsService } from "./verifications.service";
import { VerificationFingerprintService } from "./verification-fingerprint.service";
import { VerificationBillingService } from "./verification-billing.service";
import { VerificationBillingController } from "./verification-billing.controller";
import { TrustModule } from "../trust/trust.module";

import { PaymentsModule } from "../payments/payments.module";

import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    TrustModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [VerificationsController, VerificationBillingController],
  providers: [
    VerificationsService,
    VerificationFingerprintService,
    VerificationBillingService,
  ],
  exports: [
    VerificationsService,
    VerificationFingerprintService,
    VerificationBillingService,
  ],
})
export class VerificationsModule {}

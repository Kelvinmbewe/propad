import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { VerificationsController } from './verifications.controller';
import { VerificationsService } from './verifications.service';
import { VerificationFingerprintService } from './verification-fingerprint.service';
import { TrustModule } from '../trust/trust.module';

import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, AuditModule, TrustModule, PaymentsModule],
  controllers: [VerificationsController],
  providers: [VerificationsService, VerificationFingerprintService],
  exports: [VerificationsService, VerificationFingerprintService]
})
export class VerificationsModule { }

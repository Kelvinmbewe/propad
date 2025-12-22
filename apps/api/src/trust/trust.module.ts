import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrustService } from './trust.service';
import { VerificationFingerprintService } from '../verifications/verification-fingerprint.service';
import { VerificationsModule } from '../verifications/verifications.module';

@Module({
    imports: [PrismaModule, forwardRef(() => VerificationsModule)],
    providers: [TrustService],
    exports: [TrustService]
})
export class TrustModule { }

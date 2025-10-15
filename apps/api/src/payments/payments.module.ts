import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaynowGateway } from './gateways/paynow.gateway';
import { PAYMENT_GATEWAYS } from './payments.constants';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';

@Module({
  imports: [PrismaModule, AuditModule, HttpModule, MailModule],
  controllers: [PaymentsController, PaymentMethodsController],
  providers: [
    PaymentsService,
    PaymentMethodsService,
    PaynowGateway,
    PaymentGatewayRegistry,
    {
      provide: PAYMENT_GATEWAYS,
      useFactory: (paynow: PaynowGateway) => [paynow],
      inject: [PaynowGateway]
    }
  ],
  exports: [PaymentsService]
})
export class PaymentsModule {}

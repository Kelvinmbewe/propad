import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto, createPaymentIntentSchema } from './dto/create-payment-intent.dto';
import { MarkProcessingDto, markProcessingSchema } from './dto/processing-intent.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('intent')
  createIntent(@Body(new ZodValidationPipe(createPaymentIntentSchema)) dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('intent/:id/processing')
  markProcessing(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(markProcessingSchema)) _dto: MarkProcessingDto
  ) {
    return this.paymentsService.markIntentProcessing(id);
  }

  @Post('webhook/paynow')
  async paynowWebhook(@Body() body: Record<string, string>) {
    await this.paymentsService.handlePaynowWebhook(body);
    return { success: true };
  }
}

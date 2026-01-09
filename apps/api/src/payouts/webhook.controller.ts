import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks/payments')
export class WebhookController {
    constructor(private prisma: PrismaService) { }

    @Post('paynow')
    async handlePaynow(@Body() body: any, @Headers('x-signature') signature: string) {
        // 1. Log Event
        await this.prisma.paymentWebhookEvent.create({
            data: {
                provider: 'paynow',
                payload: body
            }
        });

        // 2. Verify Signature (Mock)
        if (!body.reference) {
            throw new BadRequestException('Missing reference');
        }

        // 3. Update Status
        // Logic to match reference -> PayoutExecution -> PayoutRequest
        // For now, simpler: match PayoutRequest.txRef if stored. 
        // Or better, PayoutExecution.providerRef.

        const execution = await this.prisma.payoutExecution.findFirst({
            where: { providerRef: body.reference }
        });

        if (execution) {
            // Update Execution Status
            // Update PayoutRequest Status if needed
        }

        return { received: true };
    }
}

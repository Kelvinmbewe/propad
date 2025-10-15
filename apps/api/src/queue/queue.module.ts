import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { env } from '@propad/config';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: env.REDIS_URL
      }
    })
  ]
})
export class QueueModule {}

import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { env } from '@propad/config';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: (() => {
        const redisUrl = new URL(env.REDIS_URL);
        const useTls = redisUrl.protocol === 'rediss:';
        return {
          host: redisUrl.hostname,
          port: redisUrl.port ? Number(redisUrl.port) : 6379,
          username: redisUrl.username || undefined,
          password: redisUrl.password || undefined,
          tls: useTls ? {} : undefined
        };
      })()
    })
  ]
})
export class QueueModule {}

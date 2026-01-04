import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const redisUrl = cfg.get<string>('REDIS_URL') ?? process.env.REDIS_URL;
        if (!redisUrl) throw new Error('REDIS_URL is missing');

        return {
          connection: { url: redisUrl },
          prefix: cfg.get<string>('BULL_PREFIX') ?? 'intercity',
          defaultJobOptions: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 2000,
            removeOnFail: 5000,
          },
        };
      },
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

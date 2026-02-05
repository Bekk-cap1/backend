import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL!;
    if (process.env.SKIP_EXTERNALS === 'true') {
      this.client = new Redis(redisUrl, { lazyConnect: true });
      return;
    }
    this.client = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  get raw() {
    return this.client;
  }

  ping() {
    return this.client.ping();
  }
}

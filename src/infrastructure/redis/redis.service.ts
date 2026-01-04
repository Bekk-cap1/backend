import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL!);
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

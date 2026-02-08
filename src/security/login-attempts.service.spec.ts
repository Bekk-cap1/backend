import { HttpException, UnauthorizedException } from '@nestjs/common';
import { LoginAttemptsService } from './login-attempts.service';

type MemoryRedis = {
  data: Map<string, number>;
  raw: {
    incr: (key: string) => Promise<number>;
    expire: (_key: string, _ttl: number) => Promise<number>;
    mget: (...keys: string[]) => Promise<Array<string | null>>;
    del: (...keys: string[]) => Promise<number>;
  };
};

function createMemoryRedis(): MemoryRedis {
  const data = new Map<string, number>();
  return {
    data,
    raw: {
      incr(key: string) {
        const next = (data.get(key) ?? 0) + 1;
        data.set(key, next);
        return Promise.resolve(next);
      },
      expire() {
        return Promise.resolve(1);
      },
      mget(...keys: string[]) {
        const values = keys.map((key) => {
          const value = data.get(key);
          return value == null ? null : String(value);
        });
        return Promise.resolve(values);
      },
      del(...keys: string[]) {
        let removed = 0;
        for (const key of keys) {
          if (data.delete(key)) removed += 1;
        }
        return Promise.resolve(removed);
      },
    },
  };
}

describe('LoginAttemptsService', () => {
  it('allows login when attempts are below limit', async () => {
    const redis = createMemoryRedis();
    const service = new LoginAttemptsService(redis as never);

    await expect(
      service.assertNotLocked({ phone: '+998900000000', ip: '127.0.0.1' }),
    ).resolves.toBeUndefined();
  });

  it('blocks login after max attempts', async () => {
    const redis = createMemoryRedis();
    const service = new LoginAttemptsService(redis as never);
    const context = { phone: '+998900000001', ip: '127.0.0.1' };

    for (let i = 0; i < 4; i += 1) {
      await expect(
        service.onFailure(context, new UnauthorizedException('bad creds')),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }

    await expect(
      service.onFailure(context, new UnauthorizedException('bad creds')),
    ).rejects.toBeInstanceOf(HttpException);

    await expect(service.assertNotLocked(context)).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});

import { ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { verifyWebhookHmac } from './webhook-signature.util';

describe('verifyWebhookHmac', () => {
  const rawBody = Buffer.from('{"hello":"world"}');
  const secret = 'super_secret_key';

  it('accepts valid signature', () => {
    const signature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    expect(() =>
      verifyWebhookHmac({
        provider: 'click',
        headers: { 'x-webhook-signature': signature },
        rawBody,
        secret,
      }),
    ).not.toThrow();
  });

  it('rejects missing signature', () => {
    expect(() =>
      verifyWebhookHmac({
        provider: 'click',
        headers: {},
        rawBody,
        secret,
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects invalid signature', () => {
    expect(() =>
      verifyWebhookHmac({
        provider: 'click',
        headers: { 'x-webhook-signature': 'deadbeef' },
        rawBody,
        secret,
      }),
    ).toThrow(ForbiddenException);
  });
});

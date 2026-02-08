import { ForbiddenException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

function firstHeader(
  headers: Record<string, string | string[] | undefined>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = headers[key] ?? headers[key.toLowerCase()];
    if (Array.isArray(value)) {
      if (value[0]) return String(value[0]).trim();
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function normalizeSignature(input: string) {
  return input.startsWith('sha256=') ? input.slice(7) : input;
}

export function verifyWebhookHmac(params: {
  provider: string;
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
  secret: string | undefined;
  signatureHeaders?: string[];
}) {
  const secret = params.secret?.trim();
  if (!secret) {
    throw new ForbiddenException(
      `${params.provider} webhook secret is not configured`,
    );
  }

  const signature = firstHeader(params.headers, [
    ...(params.signatureHeaders ?? []),
    'x-webhook-signature',
    'x-signature',
  ]);
  if (!signature) {
    throw new ForbiddenException(
      `${params.provider} webhook signature header is missing`,
    );
  }

  const expected = createHmac('sha256', secret)
    .update(params.rawBody)
    .digest('hex');

  const provided = normalizeSignature(signature);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(provided, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ForbiddenException(
      `${params.provider} webhook signature is invalid`,
    );
  }
}

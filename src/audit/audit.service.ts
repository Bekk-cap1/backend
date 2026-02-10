import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { getRequestContext } from '../infrastructure/request-context/request-context';
import type { AuditActionType, AuditSeverity } from './audit.actions';

type TxClient = Prisma.TransactionClient;
type AuditLogReader = {
  auditLog: {
    findFirst(args: {
      orderBy: Array<{ createdAt: 'desc' } | { id: 'desc' }>;
      select: { hash: true };
    }): Promise<{ hash: string | null } | null>;
  };
};

export type AuditInput = {
  action: AuditActionType;
  entityType: string;
  entityId?: string;
  severity?: AuditSeverity;
  metadata?: Prisma.InputJsonValue;

  // overrides (optional)
  actorId?: string;
  actorRole?: string;
  actorType?: string; // user | system | admin_service
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    const ctx = getRequestContext();
    const hashes = await this.resolveHashes(this.prisma, input, ctx);
    const metadata = withContextMetadata(input.metadata, ctx);

    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? ctx.actorId ?? null,
        actorRole: input.actorRole ?? ctx.actorRole ?? null,
        actorType: input.actorType ?? 'user',

        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        severity: input.severity ?? 'info',

        requestId: ctx.requestId ?? null,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,

        metadata,
        prevHash: hashes.prevHash,
        hash: hashes.hash,
      },
    });
  }

  async logTx(tx: TxClient, input: AuditInput) {
    const ctx = getRequestContext();
    const hashes = await this.resolveHashes(tx, input, ctx);
    const metadata = withContextMetadata(input.metadata, ctx);

    return tx.auditLog.create({
      data: {
        actorId: input.actorId ?? ctx.actorId ?? null,
        actorRole: input.actorRole ?? ctx.actorRole ?? null,
        actorType: input.actorType ?? 'user',

        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        severity: input.severity ?? 'info',

        requestId: ctx.requestId ?? null,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,

        metadata,
        prevHash: hashes.prevHash,
        hash: hashes.hash,
      },
    });
  }

  private async resolveHashes(
    client: AuditLogReader,
    input: AuditInput,
    ctx: ReturnType<typeof getRequestContext>,
  ) {
    const previous = await client.auditLog.findFirst({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { hash: true },
    });
    const prevHash = previous?.hash ?? null;

    const payload = {
      prevHash,
      actorId: input.actorId ?? ctx.actorId ?? null,
      actorRole: input.actorRole ?? ctx.actorRole ?? null,
      actorType: input.actorType ?? 'user',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      severity: input.severity ?? 'info',
      requestId: ctx.requestId ?? null,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      metadata: input.metadata ?? null,
      createdAtIso: new Date().toISOString(),
      nonce: randomUUID(),
    };

    const hash = createHash('sha256')
      .update(stableStringify(payload))
      .digest('hex');
    return { prevHash, hash };
  }
}

function withContextMetadata(
  metadata: Prisma.InputJsonValue | undefined,
  ctx: ReturnType<typeof getRequestContext>,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!ctx.impersonated) {
    return metadata ?? Prisma.DbNull;
  }

  const contextMeta = {
    impersonated: true,
    impersonatedBy: ctx.impersonatedBy ?? null,
  };

  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return {
      ...(metadata as Prisma.InputJsonObject),
      _context: contextMeta,
    } satisfies Prisma.InputJsonObject;
  }

  return {
    _context: contextMeta,
    value: metadata ?? null,
  } satisfies Prisma.InputJsonObject;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`)
    .join(',')}}`;
}

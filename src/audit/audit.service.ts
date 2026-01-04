import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { getRequestContext } from '../infrastructure/request-context/request-context';
import type { AuditActionType, AuditSeverity } from './audit.actions';

type TxClient = Prisma.TransactionClient;

export type AuditInput = {
  action: AuditActionType;
  entityType: string;
  entityId?: string;
  severity?: AuditSeverity;
  metadata?: any;

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

        metadata: input.metadata ?? null,
      },
    });
  }

  async logTx(tx: TxClient, input: AuditInput) {
    const ctx = getRequestContext();

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

        metadata: input.metadata ?? null,
      },
    });
  }
}

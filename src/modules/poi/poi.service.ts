import { Injectable, NotFoundException } from '@nestjs/common';
import { PoiReportStatus, PoiType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OutboxService } from '../../outbox/outbox.service';
import { OutboxTopic } from '../../outbox/outbox.topics';
import { CreatePoiDto } from './dto/create-poi.dto';
import { CreatePoiReportDto } from './dto/create-poi-report.dto';
import { ListPoiReportsQueryDto } from './dto/list-poi-reports.query.dto';
import { ModeratePoiReportDto } from './dto/moderate-poi-report.dto';
import { UpdatePoiDto } from './dto/update-poi.dto';
import { ImportPoiDto } from './dto/import-poi.dto';

type PoiRow = {
  id: string;
  name: string;
  type: PoiType;
  description: string | null;
  radiusMeters: number;
  isActive: boolean;
  lat: number;
  lon: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  async create(dto: CreatePoiDto) {
    const id = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO "Poi" (
        "id","name","type","description","location","radiusMeters","isActive","createdAt","updatedAt"
      )
      VALUES (
        ${id},
        ${dto.name},
        ${dto.type}::"PoiType",
        ${dto.description ?? null},
        ST_SetSRID(ST_MakePoint(${dto.lon}, ${dto.lat}), 4326)::geography,
        ${dto.radiusMeters},
        ${dto.isActive ?? true},
        NOW(),
        NOW()
      )
    `;
    return this.getById(id);
  }

  async update(id: string, dto: UpdatePoiDto) {
    const pointSql =
      dto.lat !== undefined && dto.lon !== undefined
        ? Prisma.sql`ST_SetSRID(ST_MakePoint(${dto.lon}, ${dto.lat}), 4326)::geography`
        : Prisma.sql`"location"`;

    const rows = await this.prisma.$queryRaw<PoiRow[]>`
      UPDATE "Poi"
      SET
        "name" = COALESCE(${dto.name ?? null}, "name"),
        "type" = COALESCE(${dto.type ?? null}::"PoiType", "type"),
        "description" = COALESCE(${dto.description ?? null}, "description"),
        "radiusMeters" = COALESCE(${dto.radiusMeters ?? null}, "radiusMeters"),
        "isActive" = COALESCE(${dto.isActive ?? null}, "isActive"),
        "location" = ${pointSql},
        "updatedAt" = NOW()
      WHERE "id" = ${id}
      RETURNING
        "id","name","type","description","radiusMeters","isActive","createdAt","updatedAt",
        ST_Y("location"::geometry) AS "lat",
        ST_X("location"::geometry) AS "lon"
    `;

    const row = rows[0];
    if (!row) throw new NotFoundException('POI not found');
    return row;
  }

  async remove(id: string) {
    const deleted = await this.prisma.poi.deleteMany({ where: { id } });
    if (!deleted.count) throw new NotFoundException('POI not found');
    return { ok: true };
  }

  async importMany(items: ImportPoiDto['items']) {
    const created: PoiRow[] = [];
    for (const item of items) {
      const row = await this.create({
        name: item.name,
        type: item.type,
        lat: item.lat,
        lon: item.lon,
        description: item.description,
        radiusMeters: item.radiusMeters ?? 1200,
        isActive: item.isActive ?? true,
      });
      created.push(row);
    }
    return { count: created.length, items: created };
  }

  async listAll() {
    return this.prisma.$queryRaw<PoiRow[]>`
      SELECT
        "id","name","type","description","radiusMeters","isActive","createdAt","updatedAt",
        ST_Y("location"::geometry) AS "lat",
        ST_X("location"::geometry) AS "lon"
      FROM "Poi"
      ORDER BY "createdAt" DESC
    `;
  }

  async getById(id: string) {
    const rows = await this.prisma.$queryRaw<PoiRow[]>`
      SELECT
        "id","name","type","description","radiusMeters","isActive","createdAt","updatedAt",
        ST_Y("location"::geometry) AS "lat",
        ST_X("location"::geometry) AS "lon"
      FROM "Poi"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) throw new NotFoundException('POI not found');
    return row;
  }

  async nearby(lat: number, lon: number, radiusMeters = 1200, type?: PoiType) {
    const typeWhere = type
      ? Prisma.sql`AND p."type" = ${type}::"PoiType"`
      : Prisma.sql``;

    return this.prisma.$queryRaw<Array<PoiRow & { distanceMeters: number }>>`
      SELECT
        p."id", p."name", p."type", p."description", p."radiusMeters", p."isActive",
        p."createdAt", p."updatedAt",
        ST_Y(p."location"::geometry) AS "lat",
        ST_X(p."location"::geometry) AS "lon",
        ST_Distance(
          p."location",
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        )::INT AS "distanceMeters"
      FROM "Poi" p
      WHERE p."isActive" = true
        ${typeWhere}
        AND ST_DWithin(
          p."location",
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
          ${radiusMeters}
        )
      ORDER BY "distanceMeters" ASC
      LIMIT 100
    `;
  }

  async alongRoute(polyline: string, bufferMeters = 1200, type?: PoiType) {
    const lineWkt = this.toLineStringWkt(polyline);
    const typeWhere = type
      ? Prisma.sql`AND p."type" = ${type}::"PoiType"`
      : Prisma.sql``;

    return this.prisma.$queryRaw<Array<PoiRow & { distanceMeters: number }>>`
      SELECT
        p."id", p."name", p."type", p."description", p."radiusMeters", p."isActive",
        p."createdAt", p."updatedAt",
        ST_Y(p."location"::geometry) AS "lat",
        ST_X(p."location"::geometry) AS "lon",
        ST_Distance(
          p."location",
          ST_GeogFromText(${lineWkt})
        )::INT AS "distanceMeters"
      FROM "Poi" p
      WHERE p."isActive" = true
        ${typeWhere}
        AND ST_DWithin(
          p."location",
          ST_GeogFromText(${lineWkt}),
          ${bufferMeters}
        )
      ORDER BY "distanceMeters" ASC
      LIMIT 200
    `;
  }

  async createReport(userId: string, dto: CreatePoiReportDto) {
    const id = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO "PoiReport" (
        "id","reporterId","type","description","location","radiusMeters","status","createdAt","updatedAt"
      )
      VALUES (
        ${id},
        ${userId},
        ${dto.type}::"PoiType",
        ${dto.description ?? null},
        ST_SetSRID(ST_MakePoint(${dto.lon}, ${dto.lat}), 4326)::geography,
        ${dto.radiusMeters ?? 1200},
        ${PoiReportStatus.pending}::"PoiReportStatus",
        NOW(),
        NOW()
      )
    `;

    await this.outbox.enqueue({
      topic: OutboxTopic.PoiReportCreated,
      aggregateType: 'poiReport',
      aggregateId: id,
      idempotencyKey: `poiReport:${id}:created`,
      payload: {
        reportId: id,
        reporterId: userId,
        type: dto.type,
      },
    });

    return this.getReportById(id);
  }

  async listReports(q: ListPoiReportsQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const where: Prisma.PoiReportWhereInput = {
      ...(q.status ? { status: q.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.poiReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: { select: { id: true, phone: true, role: true } },
          poi: { select: { id: true, name: true, type: true, isActive: true } },
        },
      }),
      this.prisma.poiReport.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async approveReport(
    reportId: string,
    moderatorId: string,
    dto: ModeratePoiReportDto,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.poiReport.findUnique({ where: { id: reportId } });
      if (!report) throw new NotFoundException('POI report not found');

      let poiId = report.poiId;
      if (!poiId) {
        const id = randomUUID();
        await tx.$executeRaw`
          INSERT INTO "Poi"
            ("id","name","type","description","location","radiusMeters","isActive","createdAt","updatedAt")
          SELECT
            ${id},
            ${'Reported ' + report.type},
            r."type",
            r."description",
            r."location",
            r."radiusMeters",
            true,
            NOW(),
            NOW()
          FROM "PoiReport" r
          WHERE r."id" = ${reportId}
        `;
        poiId = id;
      }

      const updated = await tx.poiReport.update({
        where: { id: reportId },
        data: {
          status: PoiReportStatus.approved,
          moderatedById: moderatorId,
          moderatedAt: new Date(),
          moderationNote: dto.note ?? null,
          poiId,
        },
      });

      await this.outbox.enqueueTx(tx, {
        topic: OutboxTopic.PoiReportApproved,
        aggregateType: 'poiReport',
        aggregateId: reportId,
        idempotencyKey: `poiReport:${reportId}:approved`,
        payload: {
          reportId,
          moderatorId,
          poiId,
        },
      });

      return updated;
    });
  }

  async rejectReport(
    reportId: string,
    moderatorId: string,
    dto: ModeratePoiReportDto,
  ) {
    const report = await this.prisma.poiReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('POI report not found');

    const updated = await this.prisma.poiReport.update({
      where: { id: reportId },
      data: {
        status: PoiReportStatus.rejected,
        moderatedById: moderatorId,
        moderatedAt: new Date(),
        moderationNote: dto.note ?? null,
      },
    });

    await this.outbox.enqueue({
      topic: OutboxTopic.PoiReportRejected,
      aggregateType: 'poiReport',
      aggregateId: reportId,
      idempotencyKey: `poiReport:${reportId}:rejected`,
      payload: {
        reportId,
        moderatorId,
      },
    });

    return updated;
  }

  private toLineStringWkt(polyline: string): string {
    // Expected deterministic CI format: "lat,lon;lat,lon;..."
    const coords = polyline
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [latRaw, lonRaw] = p.split(',');
        const lat = Number(latRaw);
        const lon = Number(lonRaw);
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          throw new Error('Invalid polyline format');
        }
        return `${lon} ${lat}`;
      });

    if (coords.length < 2) {
      throw new Error('Polyline must contain at least 2 points');
    }

    return `LINESTRING(${coords.join(',')})`;
  }

  private async getReportById(reportId: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        reporterId: string;
        poiId: string | null;
        type: PoiType;
        description: string | null;
        radiusMeters: number;
        status: PoiReportStatus;
        moderatedById: string | null;
        moderatedAt: Date | null;
        moderationNote: string | null;
        lat: number;
        lon: number;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT
        p."id", p."reporterId", p."poiId", p."type", p."description", p."radiusMeters",
        p."status", p."moderatedById", p."moderatedAt", p."moderationNote",
        ST_Y(p."location"::geometry) AS "lat",
        ST_X(p."location"::geometry) AS "lon",
        p."createdAt", p."updatedAt"
      FROM "PoiReport" p
      WHERE p."id" = ${reportId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) throw new NotFoundException('POI report not found');
    return row;
  }
}

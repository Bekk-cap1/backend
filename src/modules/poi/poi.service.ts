import { Injectable, NotFoundException } from '@nestjs/common';
import { PoiType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreatePoiDto } from './dto/create-poi.dto';
import { UpdatePoiDto } from './dto/update-poi.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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
}

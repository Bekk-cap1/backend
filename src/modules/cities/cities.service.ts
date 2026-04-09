import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { ListCitiesDto } from './dto/list-cities.dto';
import { SuggestCityDto } from './dto/suggest-city.dto';
import { isPrismaError } from '../../common/utils/prisma-error';

type Tx = PrismaClient | Prisma.TransactionClient;

type CityCoordRow = {
  id: string;
  lat: number | null;
  lon: number | null;
};

type NominatimRow = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    region?: string;
    country?: string;
    country_code?: string;
  };
};

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  private isLegacyCitySchemaError(error: unknown): boolean {
    if (!isPrismaError(error)) return false;
    return error.code === 'P2021' || error.code === 'P2022';
  }

  async suggest(dto: SuggestCityDto) {
    const q = dto.q.trim();
    if (q.length < 2) return { items: [] };

    const limit = Math.min(Math.max(dto.limit ?? 6, 1), 10);
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', String(limit));

    let rows: NominatimRow[] = [];
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'IntercityBackend/1.0 (support@intercity.local)',
          'Accept-Language': 'ru,en',
        },
      });
      if (!response.ok) {
        throw new BadRequestException('City suggestion provider is unavailable');
      }
      rows = (await response.json()) as NominatimRow[];
    } catch {
      throw new BadRequestException('City suggestion provider is unavailable');
    }
    const items = rows
      .map((row) => {
        const cityName = this.extractCityName(row);
        const lat = Number(row.lat);
        const lon = Number(row.lon);
        if (!cityName || !Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
        }
        const countryCode = (row.address?.country_code ?? 'UZ').toUpperCase();
        return {
          sourceId: String(row.place_id),
          name: cityName,
          countryCode,
          region: row.address?.state ?? row.address?.region ?? row.address?.county ?? null,
          timezone: this.inferTimezone(countryCode),
          lat,
          lon,
          displayName: row.display_name,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null);

    return { items };
  }

  async list(dto: ListCitiesDto) {
    const {
      q,
      limit = 20,
      offset = 0,
      sortBy = 'name',
      order = 'asc',
      includeInactive = false,
    } = dto;

    const where: Prisma.CityWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { region: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
      ...(includeInactive ? {} : { isActive: true }),
    };

    let items: Array<
      Prisma.CityGetPayload<object>
    > = [];
    let total = 0;

    try {
      [items, total] = await this.prisma.$transaction([
        this.prisma.city.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { [sortBy]: order },
        }),
        this.prisma.city.count({ where }),
      ]);
    } catch (error) {
      if (!this.isLegacyCitySchemaError(error)) {
        throw error;
      }
      const legacyWhere: Prisma.CityWhereInput = q
        ? {
            OR: [
              { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { region: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {};
      [items, total] = await this.prisma.$transaction([
        this.prisma.city.findMany({
          where: legacyWhere,
          take: limit,
          skip: offset,
          orderBy: { [sortBy]: order },
        }),
        this.prisma.city.count({ where: legacyWhere }),
      ]);
    }

    const coords = await this.getCoordsByIds(items.map((item) => item.id));

    return {
      items: items.map((item) => ({
        ...item,
        isActive:
          'isActive' in item && typeof item.isActive === 'boolean'
            ? item.isActive
            : true,
        territoryRadiusKm:
          'territoryRadiusKm' in item &&
          typeof item.territoryRadiusKm === 'number'
            ? item.territoryRadiusKm
            : 80,
        lat: coords.get(item.id)?.lat ?? null,
        lon: coords.get(item.id)?.lon ?? null,
      })),
      total,
      limit,
      offset,
    };
  }

  async getById(id: string) {
    return this.getByIdWithClient(this.prisma, id);
  }

  async create(dto: CreateCityDto) {
    const name = dto.name.trim();
    const countryCode = (dto.countryCode ?? 'UZ').trim().toUpperCase();
    this.assertLatLonPair(dto.lat, dto.lon);

    try {
      return await this.prisma.$transaction(async (tx) => {
        let created: Awaited<ReturnType<typeof tx.city.create>>;
        try {
          created = await tx.city.create({
            data: {
              name,
              countryCode,
              region: dto.region?.trim(),
              timezone: dto.timezone?.trim(),
              isActive: dto.isActive ?? true,
              territoryRadiusKm: dto.territoryRadiusKm ?? 80,
            },
          });
        } catch (error) {
          if (!this.isLegacyCitySchemaError(error)) throw error;
          created = await tx.city.create({
            data: {
              name,
              countryCode,
              region: dto.region?.trim(),
              timezone: dto.timezone?.trim(),
            },
          });
        }

        if (dto.lat !== undefined && dto.lon !== undefined) {
          await this.setLocation(tx, created.id, dto.lat, dto.lon);
        }

        return this.getByIdWithClient(tx, created.id);
      });
    } catch (e: unknown) {
      if (isPrismaError(e) && e.code === 'P2002') {
        throw new BadRequestException('City already exists');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateCityDto) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('City not found');
    this.assertLatLonPair(dto.lat, dto.lon);

    const nextName = dto.name ? dto.name.trim() : undefined;
    const nextCountryCode = dto.countryCode
      ? dto.countryCode.trim().toUpperCase()
      : undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        try {
          await tx.city.update({
            where: { id },
            data: {
              name: nextName,
              countryCode: nextCountryCode,
              region: dto.region?.trim(),
              timezone: dto.timezone?.trim(),
              ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
              ...(dto.territoryRadiusKm !== undefined
                ? { territoryRadiusKm: dto.territoryRadiusKm }
                : {}),
            },
          });
        } catch (error) {
          if (!this.isLegacyCitySchemaError(error)) throw error;
          await tx.city.update({
            where: { id },
            data: {
              name: nextName,
              countryCode: nextCountryCode,
              region: dto.region?.trim(),
              timezone: dto.timezone?.trim(),
            },
          });
        }

        if (dto.lat !== undefined && dto.lon !== undefined) {
          await this.setLocation(tx, id, dto.lat, dto.lon);
        }

        return this.getByIdWithClient(tx, id);
      });
    } catch (e: unknown) {
      if (isPrismaError(e) && e.code === 'P2002') {
        throw new BadRequestException('City already exists');
      }
      throw e;
    }
  }

  async toggle(id: string, value?: boolean) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('City not found');

    let updated: Awaited<ReturnType<typeof this.prisma.city.update>>;
    try {
      updated = await this.prisma.city.update({
        where: { id },
        data: {
          isActive:
            value ??
            ('isActive' in existing && typeof existing.isActive === 'boolean'
              ? !existing.isActive
              : true),
        },
      });
    } catch (error) {
      if (!this.isLegacyCitySchemaError(error)) throw error;
      updated = existing;
    }

    const coords = await this.getCoordsByIds([id]);
    return {
      ...updated,
      isActive:
        'isActive' in updated && typeof updated.isActive === 'boolean'
          ? updated.isActive
          : true,
      territoryRadiusKm:
        'territoryRadiusKm' in updated &&
        typeof updated.territoryRadiusKm === 'number'
          ? updated.territoryRadiusKm
          : 80,
      lat: coords.get(id)?.lat ?? null,
      lon: coords.get(id)?.lon ?? null,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('City not found');

    try {
      await this.prisma.city.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new BadRequestException(
        'City is used in trips and cannot be deleted',
      );
    }
  }

  private assertLatLonPair(lat?: number, lon?: number) {
    const hasLat = lat !== undefined;
    const hasLon = lon !== undefined;
    if (hasLat !== hasLon) {
      throw new BadRequestException('lat and lon must be provided together');
    }
  }

  private extractCityName(row: NominatimRow) {
    const address = row.address;
    return (
      address?.city ??
      address?.town ??
      address?.village ??
      address?.municipality ??
      row.display_name.split(',')[0]?.trim() ??
      null
    );
  }

  private inferTimezone(countryCode: string) {
    const map: Record<string, string> = {
      UZ: 'Asia/Tashkent',
      KG: 'Asia/Bishkek',
      TJ: 'Asia/Dushanbe',
      KZ: 'Asia/Almaty',
      RU: 'Europe/Moscow',
      TR: 'Europe/Istanbul',
      AE: 'Asia/Dubai',
      US: 'America/New_York',
    };
    return map[countryCode] ?? 'UTC';
  }

  private async setLocation(tx: Tx, cityId: string, lat: number, lon: number) {
    try {
      await tx.$executeRaw`
        UPDATE "City"
        SET "location" = ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        WHERE "id" = ${cityId}
      `;
    } catch {
      // Keep city creation/update working even if PostGIS/location column is unavailable.
    }
  }

  private async getByIdWithClient(client: Tx, id: string) {
    const city = await client.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');

    const coords = await this.getCoordsByIdsByClient(client, [id]);
    return {
      ...city,
      isActive:
        'isActive' in city && typeof city.isActive === 'boolean'
          ? city.isActive
          : true,
      territoryRadiusKm:
        'territoryRadiusKm' in city && typeof city.territoryRadiusKm === 'number'
          ? city.territoryRadiusKm
          : 80,
      lat: coords.get(id)?.lat ?? null,
      lon: coords.get(id)?.lon ?? null,
    };
  }

  private async getCoordsByIds(ids: string[]) {
    return this.getCoordsByIdsByClient(this.prisma, ids);
  }

  private async getCoordsByIdsByClient(client: Tx, ids: string[]) {
    if (!ids.length) return new Map<string, { lat: number | null; lon: number | null }>();

    let rows: CityCoordRow[] = [];
    try {
      rows = await client.$queryRaw<CityCoordRow[]>`
        SELECT
          c."id",
          ST_Y(c."location"::geometry) AS "lat",
          ST_X(c."location"::geometry) AS "lon"
        FROM "City" c
        WHERE c."id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}`))})
      `;
    } catch {
      return new Map(ids.map((id) => [id, { lat: null, lon: null }]));
    }

    return new Map(
      rows.map((row) => [row.id, { lat: row.lat, lon: row.lon }]),
    );
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { ListCitiesDto } from './dto/list-cities.dto';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: ListCitiesDto) {
    const { q, limit = 20, offset = 0, sortBy = 'name', order = 'asc' } = dto;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { region: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.city.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: order },
      }),
      this.prisma.city.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async getById(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async create(dto: CreateCityDto) {
    const name = dto.name.trim();
    const countryCode = (dto.countryCode ?? 'UZ').trim().toUpperCase();

    try {
      return await this.prisma.city.create({
        data: {
          name,
          countryCode,
          region: dto.region?.trim(),
          timezone: dto.timezone?.trim(),
        },
      });
    } catch (e: any) {
      // unique violation
      if (e?.code === 'P2002') throw new BadRequestException('City already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateCityDto) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('City not found');

    const nextName = dto.name ? dto.name.trim() : undefined;
    const nextCountryCode = dto.countryCode ? dto.countryCode.trim().toUpperCase() : undefined;

    try {
      return await this.prisma.city.update({
        where: { id },
        data: {
          name: nextName,
          countryCode: nextCountryCode,
          region: dto.region?.trim(),
          timezone: dto.timezone?.trim(),
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new BadRequestException('City already exists');
      throw e;
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.city.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('City not found');

    // В полноценном проекте удаление города опасно: связи tripsFrom/tripsTo.
    // Поэтому лучше soft-delete. Пока сделаем hard-delete с явной ошибкой если есть связи.
    try {
      await this.prisma.city.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      // foreign key fail
      throw new BadRequestException('City is used in trips and cannot be deleted');
    }
  }
}

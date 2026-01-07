import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesDto } from './dto/list-vehicles.dto';
import type { AuthUser } from '../../common/types/auth-user';
import { isPrismaError } from '../../common/utils/prisma-error';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  private getUserId(user: AuthUser) {
    return user.sub ?? user.id;
  }

  private isAdmin(user: AuthUser) {
    return user.role === 'admin' || user.role === 'moderator';
  }

  private ensureDriverOrAdmin(user: AuthUser) {
    if (user.role !== 'driver' && !this.isAdmin(user)) {
      throw new ForbiddenException('Only drivers can manage vehicles');
    }
  }

  async listMine(user: AuthUser, dto: ListVehiclesDto) {
    this.ensureDriverOrAdmin(user);
    const userId = this.getUserId(user);

    const {
      q,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      order = 'desc',
    } = dto;

    const where = {
      userId,
      ...(q
        ? {
            OR: [
              { make: { contains: q, mode: 'insensitive' as const } },
              { model: { contains: q, mode: 'insensitive' as const } },
              { plateNo: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: order },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  async createMine(user: AuthUser, dto: CreateVehicleDto) {
    this.ensureDriverOrAdmin(user);
    const userId = this.getUserId(user);

    const plateNo = dto.plateNo.trim().toUpperCase();

    try {
      return await this.prisma.vehicle.create({
        data: {
          userId,
          make: dto.make.trim(),
          model: dto.model.trim(),
          plateNo,
          color: dto.color?.trim(),
          seats: dto.seats ?? 4,
        },
      });
    } catch (e: unknown) {
      if (isPrismaError(e) && e.code === 'P2002')
        throw new BadRequestException('Vehicle with this plate already exists');
      throw e;
    }
  }

  async updateMine(user: AuthUser, vehicleId: string, dto: UpdateVehicleDto) {
    this.ensureDriverOrAdmin(user);
    const userId = this.getUserId(user);

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (!this.isAdmin(user) && vehicle.userId !== userId) {
      throw new ForbiddenException('You can update only your vehicles');
    }

    const plateNo = dto.plateNo ? dto.plateNo.trim().toUpperCase() : undefined;

    try {
      return await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          make: dto.make?.trim(),
          model: dto.model?.trim(),
          plateNo,
          color: dto.color?.trim(),
          seats: dto.seats,
        },
      });
    } catch (e: unknown) {
      if (isPrismaError(e) && e.code === 'P2002')
        throw new BadRequestException('Vehicle with this plate already exists');
      throw e;
    }
  }

  async removeMine(user: AuthUser, vehicleId: string) {
    this.ensureDriverOrAdmin(user);
    const userId = this.getUserId(user);

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { trips: { take: 1 } },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (!this.isAdmin(user) && vehicle.userId !== userId) {
      throw new ForbiddenException('You can delete only your vehicles');
    }

    // Полноценный проект: не удаляем если есть поездки (история нужна)
    if (vehicle.trips.length > 0) {
      throw new BadRequestException('Vehicle has trips and cannot be deleted');
    }

    await this.prisma.vehicle.delete({ where: { id: vehicleId } });
    return { ok: true };
  }

  // Admin endpoints (optional)
  async listAll(user: AuthUser, dto: ListVehiclesDto) {
    if (!this.isAdmin(user)) throw new ForbiddenException('Admin only');

    const {
      q,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      order = 'desc',
    } = dto;

    const where = q
      ? {
          OR: [
            { make: { contains: q, mode: 'insensitive' as const } },
            { model: { contains: q, mode: 'insensitive' as const } },
            { plateNo: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { [sortBy]: order },
        include: { user: { select: { id: true, phone: true, role: true } } },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { items, total, limit, offset };
  }
}

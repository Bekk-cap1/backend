import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class AdminUsersQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBanned?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by verified drivers only (has driverProfile.verified)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ description: 'ISO date, createdAt >=' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date, createdAt <=' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

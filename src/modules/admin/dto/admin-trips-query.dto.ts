import { ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdminTripsQueryDto {
  @ApiPropertyOptional({ enum: TripStatus })
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional({ description: 'ISO date, departureAt >=' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date, departureAt <=' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

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

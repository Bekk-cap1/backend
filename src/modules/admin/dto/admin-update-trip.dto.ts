import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminUpdateTripDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsTotal?: number;

  @ApiPropertyOptional({ description: 'ISO datetime' })
  @IsOptional()
  @IsDateString()
  departureAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromCityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toCityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Set true to detach vehicle from trip' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  clearVehicle?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

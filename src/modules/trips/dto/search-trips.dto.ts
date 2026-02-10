import { TripStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const normalized = trimmed.toLowerCase();
  if (normalized === 'undefined' || normalized === 'null' || normalized === 'all') {
    return undefined;
  }
  return trimmed;
};

const parseOptionalInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const parseOptionalPositiveInt = (
  value: unknown,
  max?: number,
): number | undefined => {
  const parsed = parseOptionalInt(value);
  if (parsed === undefined || parsed <= 0) return undefined;
  if (max !== undefined && parsed > max) return max;
  return parsed;
};

export class SearchTripsDto {
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsUUID()
  fromCityId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsUUID()
  toCityId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value))
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalInt(value))
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, 200))
  @IsInt()
  @Min(1)
  pageSize?: number;
}

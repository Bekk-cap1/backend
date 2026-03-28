import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseIntNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export class PlaceAutocompleteDto {
  @IsString()
  q!: string;

  @IsOptional()
  @Transform(({ value }) => parseIntNumber(value))
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseNumber(value))
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Transform(({ value }) => parseNumber(value))
  @IsNumber()
  lon?: number;
}


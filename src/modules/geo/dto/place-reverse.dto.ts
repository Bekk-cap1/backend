import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export class PlaceReverseDto {
  @Transform(({ value }) => parseNumber(value))
  @IsNumber()
  lat!: number;

  @Transform(({ value }) => parseNumber(value))
  @IsNumber()
  lon!: number;
}


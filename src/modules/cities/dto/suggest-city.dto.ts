import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const parseOptionalInt = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export class SuggestCityDto {
  @IsString()
  q!: string;

  @IsOptional()
  @Transform(({ value }) => parseOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 6;
}

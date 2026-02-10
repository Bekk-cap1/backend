import {
  Transform,
  Type,
} from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

const parseOptionalBool = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'on') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'off') return false;
  }
  return undefined;
};

export class CreateCityDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 4)
  countryCode?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  region?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  timezone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lon?: number;

  @IsOptional()
  @Transform(({ value }) => parseOptionalBool(value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  territoryRadiusKm?: number;
}

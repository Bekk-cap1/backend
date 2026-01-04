import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

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
}

import { IsOptional, IsString, Length } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 4)
  countryCode?: string; // default UZ на уровне БД

  @IsOptional()
  @IsString()
  @Length(2, 120)
  region?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  timezone?: string; // default может быть null, но у тебя в seed Asia/Tashkent
}

import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  make?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  model?: string;

  @IsOptional()
  @IsString()
  @Length(3, 20)
  plateNo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seats?: number;
}

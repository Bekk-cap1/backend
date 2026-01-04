import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @Length(1, 60)
  make!: string;

  @IsString()
  @Length(1, 60)
  model!: string;

  @IsString()
  @Length(3, 20)
  plateNo!: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seats?: number = 4;
}

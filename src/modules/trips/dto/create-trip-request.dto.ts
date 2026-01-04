import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTripRequestDto {
  @IsInt()
  @Min(1)
  seats!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  message?: string;
}

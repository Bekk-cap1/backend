import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTripRequestDto {
  @IsInt()
  @Min(1)
  @Max(8)
  seats!: number;

  @IsInt()
  @Min(0)
  price!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  message?: string;
}

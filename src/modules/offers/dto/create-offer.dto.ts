import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class CreateOfferDto {
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
  @MaxLength(500)
  message?: string;
}

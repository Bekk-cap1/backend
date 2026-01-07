import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateOfferDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seats?: number;

  @IsInt()
  @Min(1)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

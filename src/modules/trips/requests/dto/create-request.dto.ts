import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTripRequestDto {
  @IsInt()
  @Min(1)
  @Max(8)
  seats!: number;

  @IsInt()
  @Min(1)
  price!: number;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(8, { each: true })
  seatNumbers?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pickupAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  dropoffAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  pickupPlaceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  dropoffPlaceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLon?: number;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLon?: number;
}

import {
  IsDateString,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsUUID()
  fromCityId!: string;

  @IsUUID()
  toCityId!: string;

  @IsOptional()
  @IsLatitude()
  fromLat?: number;

  @IsOptional()
  @IsLongitude()
  fromLon?: number;

  @IsOptional()
  @IsLatitude()
  toLat?: number;

  @IsOptional()
  @IsLongitude()
  toLon?: number;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsDateString()
  departureAt!: string;

  @IsOptional()
  @IsDateString()
  arriveAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seatsTotal?: number;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

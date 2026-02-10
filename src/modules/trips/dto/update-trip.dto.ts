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

export class UpdateTripDto {
  @IsOptional()
  @IsUUID()
  fromCityId?: string;

  @IsOptional()
  @IsUUID()
  toCityId?: string;

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

  @IsOptional()
  @IsDateString()
  departureAt?: string;

  @IsOptional()
  @IsDateString()
  arriveAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  seatsTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

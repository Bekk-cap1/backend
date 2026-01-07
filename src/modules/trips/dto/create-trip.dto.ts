import {
  IsDateString,
  IsInt,
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
  @Min(0) // если хочешь запретить бесплатные — поставь Min(1)
  price!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

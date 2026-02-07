import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PoiType } from '@prisma/client';

export class RoutePoiDto {
  @IsString()
  polyline!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(10000)
  bufferMeters = 1200;

  @IsOptional()
  @IsEnum(PoiType)
  type?: PoiType;
}

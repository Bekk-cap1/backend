import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePoiReportDto {
  @ApiProperty({ enum: PoiType })
  @IsEnum(PoiType)
  type!: PoiType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ minimum: 100, maximum: 3000, default: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(3000)
  radiusMeters?: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminCreateRadarDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ enum: PoiType, default: PoiType.speed_camera })
  @IsOptional()
  @IsEnum(PoiType)
  type?: PoiType;

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
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ default: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(10000)
  radiusMeters?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { PoiType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class AdminRadarImportItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: PoiType, default: PoiType.speed_camera })
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

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(50)
  @Max(10000)
  radiusMeters?: number;

  @ApiProperty()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class AdminImportRadarsDto {
  @ApiProperty({ type: [AdminRadarImportItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminRadarImportItemDto)
  items!: AdminRadarImportItemDto[];

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

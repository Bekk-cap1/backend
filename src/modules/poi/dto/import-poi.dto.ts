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
  ValidateNested,
} from 'class-validator';

class ImportPoiItemDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: PoiType })
  @IsEnum(PoiType)
  type!: PoiType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  lon!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusMeters?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ImportPoiDto {
  @ApiProperty({ type: [ImportPoiItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportPoiItemDto)
  items!: ImportPoiItemDto[];
}

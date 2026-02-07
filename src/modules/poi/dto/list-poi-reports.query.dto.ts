import { ApiPropertyOptional } from '@nestjs/swagger';
import { PoiReportStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListPoiReportsQueryDto {
  @ApiPropertyOptional({ enum: PoiReportStatus })
  @IsOptional()
  @IsEnum(PoiReportStatus)
  status?: PoiReportStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

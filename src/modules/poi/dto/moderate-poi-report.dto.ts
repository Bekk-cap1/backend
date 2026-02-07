import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ModeratePoiReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

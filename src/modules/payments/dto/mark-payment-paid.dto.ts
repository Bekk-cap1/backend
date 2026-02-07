import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkPaymentPaidDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

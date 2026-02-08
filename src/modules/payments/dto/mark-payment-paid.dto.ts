import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class MarkPaymentPaidDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description:
      'Client-supplied idempotency key to safely retry mark-paid requests',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

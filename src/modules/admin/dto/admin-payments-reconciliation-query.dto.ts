import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdminPaymentsReconciliationQueryDto {
  @ApiPropertyOptional({
    description: 'UTC ISO datetime, inclusive lower bound',
    example: '2026-02-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'UTC ISO datetime, inclusive upper bound',
    example: '2026-02-08T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Pending timeout threshold in minutes',
    example: 60,
    minimum: 1,
    maximum: 10080,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_080)
  staleMinutes?: number;
}

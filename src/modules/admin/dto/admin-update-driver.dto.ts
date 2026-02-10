import { ApiPropertyOptional } from '@nestjs/swagger';
import { DriverStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AdminUpdateDriverDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passportNo?: string;

  @ApiPropertyOptional({ enum: DriverStatus })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

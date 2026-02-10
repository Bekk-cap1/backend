import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DriverStatus, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AdminSendNotificationDto {
  @ApiPropertyOptional({ default: 'system' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

export class AdminSendSegmentNotificationDto extends AdminSendNotificationDto {
  @ApiPropertyOptional({ enum: Role, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBanned?: boolean;

  @ApiPropertyOptional({ enum: DriverStatus })
  @IsOptional()
  @IsEnum(DriverStatus)
  driverStatus?: DriverStatus;
}

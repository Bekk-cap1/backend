import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminTicketAssignDto {
  @ApiProperty()
  @IsString()
  adminId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

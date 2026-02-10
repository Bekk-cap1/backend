import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminTicketCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  comment!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}

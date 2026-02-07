import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsString()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;
}

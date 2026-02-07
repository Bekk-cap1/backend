import { Type } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';

export class PaymentQuoteDto {
  @IsString()
  tripId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  seats = 1;
}

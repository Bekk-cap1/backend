import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaymentProvider } from '@prisma/client';

export class CreatePaymentIntentDto {
  @IsUUID()
  bookingId!: string;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  // идемпотентность с клиента (можно uuid)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;

  // если нужно добавить мета/description
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

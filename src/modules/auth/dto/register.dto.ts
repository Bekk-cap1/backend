import { Transform } from 'class-transformer';
import { IsString, MinLength, Matches } from 'class-validator';

const normalizePhoneTransform = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/\s+/g, '').trim() : value;

export class RegisterDto {
  @Transform(normalizePhoneTransform)
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

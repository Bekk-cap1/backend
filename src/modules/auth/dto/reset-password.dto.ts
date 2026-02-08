import { Transform } from 'class-transformer';
import { IsString, Matches, MinLength } from 'class-validator';

const normalizePhoneTransform = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.replace(/\s+/g, '').trim() : value;

export class ResetPasswordRequestDto {
  @Transform(normalizePhoneTransform)
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;
}

export class ResetPasswordConfirmDto {
  @Transform(normalizePhoneTransform)
  @IsString()
  @Matches(/^\+?\d{9,15}$/)
  phone!: string;

  @IsString()
  code!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(7)
  phone?: string;

  @IsOptional()
  @IsIn([
    'passenger',
    'driver',
    'admin',
    'moderator',
    'finance',
    'support',
    'ops',
    'superadmin',
  ])
  role?:
    | 'passenger'
    | 'driver'
    | 'admin'
    | 'moderator'
    | 'finance'
    | 'support'
    | 'ops'
    | 'superadmin';

  @IsString()
  @MinLength(10)
  reason!: string;
}

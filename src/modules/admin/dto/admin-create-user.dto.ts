import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminCreateUserDto {
  @IsString()
  @MinLength(7)
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

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
}

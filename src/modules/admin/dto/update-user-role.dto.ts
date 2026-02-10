import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserRoleDto {
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
  role!:
    | 'passenger'
    | 'driver'
    | 'admin'
    | 'moderator'
    | 'finance'
    | 'support'
    | 'ops'
    | 'superadmin';

  @IsOptional()
  @IsString()
  @MinLength(10)
  reason?: string;
}

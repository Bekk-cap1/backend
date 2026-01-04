import { IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsIn(['passenger', 'driver', 'admin', 'moderator'])
  role!: 'passenger' | 'driver' | 'admin' | 'moderator';
}

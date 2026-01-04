import { IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsIn(['passenger', 'driver', 'admin'])
  role!: 'passenger' | 'driver' | 'admin';
}

import { IsIn, IsString, MinLength } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  @IsIn(['driver_doc', 'poi_import', 'avatar'])
  purpose!: 'driver_doc' | 'poi_import' | 'avatar';

  @IsString()
  @MinLength(3)
  contentType!: string;

  @IsString()
  @MinLength(1)
  fileName!: string;
}

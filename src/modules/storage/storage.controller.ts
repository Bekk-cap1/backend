import { Body, Controller, Post } from '@nestjs/common';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storage: StorageService) {}

  @Post('presign')
  presign(@Body() dto: PresignUploadDto) {
    const data = this.storage.presignUpload(dto);
    return { ok: true, data };
  }
}

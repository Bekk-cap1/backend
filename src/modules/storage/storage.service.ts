import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  presignUpload(input: {
    purpose: 'driver_doc' | 'poi_import' | 'avatar';
    contentType: string;
    fileName: string;
  }) {
    const provider = (process.env.STORAGE_PROVIDER ?? 'none').toLowerCase();
    const ttlSec = Number(process.env.STORAGE_SIGNED_URL_TTL_SEC ?? 900);
    const baseUrl =
      process.env.STORAGE_PUBLIC_BASE_URL?.trim() ||
      'https://storage.local/intercity';

    const ext = this.extractExtension(input.fileName);
    const key = `${input.purpose}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${ext}`;
    const publicUrl = `${baseUrl.replace(/\/$/, '')}/${key}`;

    // In provider=none mode we still return deterministic URLs
    // for link-only flow and local development.
    const uploadUrl = `${publicUrl}?uploadToken=${randomUUID()}&expiresIn=${ttlSec}&provider=${provider}`;

    return {
      provider,
      key,
      publicUrl,
      uploadUrl,
      expiresInSec: ttlSec,
      contentType: input.contentType,
    };
  }

  private extractExtension(fileName: string) {
    const clean = fileName.trim();
    const dot = clean.lastIndexOf('.');
    if (dot <= 0 || dot === clean.length - 1) return '';
    return clean.slice(dot).toLowerCase();
  }
}

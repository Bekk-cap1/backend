import { registerAs } from '@nestjs/config';

export const mapsConfig = registerAs('maps', () => ({
  provider: process.env.MAPS_PROVIDER ?? 'google',
  apiKey: process.env.MAPS_API_KEY ?? '',
}));

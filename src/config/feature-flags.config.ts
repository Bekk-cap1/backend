import { registerAs } from '@nestjs/config';

export default registerAs('features', () => ({
  swaggerEnabled: String(process.env.SWAGGER_ENABLED ?? 'false') === 'true',
  realtimeEnabled: String(process.env.REALTIME_ENABLED ?? 'false') === 'true',
}));

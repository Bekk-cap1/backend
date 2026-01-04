import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 2_592_000),
}));

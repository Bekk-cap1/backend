import { registerAs } from '@nestjs/config';

function toPositiveInt(value: string | undefined, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

export default registerAs('negotiation', () => ({
  maxDriverOffers: toPositiveInt(process.env.OFFERS_MAX_DRIVER, 3),
  maxPassengerOffers: toPositiveInt(process.env.OFFERS_MAX_PASSENGER, 3),
}));

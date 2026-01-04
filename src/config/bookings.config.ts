import { registerAs } from '@nestjs/config';

export const bookingsConfig = registerAs('bookings', () => ({
  cancelFeePercent: Number(process.env.BOOKING_CANCEL_FEE_PERCENT ?? 10),
}));

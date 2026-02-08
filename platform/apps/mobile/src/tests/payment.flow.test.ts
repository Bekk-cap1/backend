import { describe, expect, it } from 'vitest';
import { extractRedirectUrl, isBookingPaid, isPaymentTerminal } from '../screens/passenger/payments.flow';

describe('payment flow helpers', () => {
  it('extracts redirect url from multiple provider payload shapes', () => {
    expect(extractRedirectUrl({ intent: { redirectUrl: 'https://pay/1' } })).toBe('https://pay/1');
    expect(extractRedirectUrl({ intent: { url: 'https://pay/2' } })).toBe('https://pay/2');
    expect(extractRedirectUrl({ checkoutUrl: 'https://pay/3' })).toBe('https://pay/3');
  });

  it('returns null for payload without url', () => {
    expect(extractRedirectUrl({ intent: { raw: true } })).toBeNull();
  });

  it('classifies payment terminal statuses', () => {
    expect(isPaymentTerminal('paid')).toBe(true);
    expect(isPaymentTerminal('failed')).toBe(true);
    expect(isPaymentTerminal('pending')).toBe(false);
  });

  it('detects booking paid status', () => {
    expect(isBookingPaid('paid')).toBe(true);
    expect(isBookingPaid('confirmed')).toBe(false);
  });
});

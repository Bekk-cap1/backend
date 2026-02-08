export function extractRedirectUrl(intentPayload: any): string | null {
  if (typeof intentPayload?.intent?.redirectUrl === 'string') {
    return intentPayload.intent.redirectUrl;
  }
  if (typeof intentPayload?.intent?.url === 'string') {
    return intentPayload.intent.url;
  }
  if (typeof intentPayload?.redirectUrl === 'string') {
    return intentPayload.redirectUrl;
  }
  if (typeof intentPayload?.checkoutUrl === 'string') {
    return intentPayload.checkoutUrl;
  }
  return null;
}

export function isPaymentTerminal(status: unknown) {
  const value = String(status ?? '').toLowerCase();
  return value === 'paid' || value === 'failed' || value === 'refunded' || value === 'canceled';
}

export function isBookingPaid(status: unknown) {
  return String(status ?? '').toLowerCase() === 'paid';
}

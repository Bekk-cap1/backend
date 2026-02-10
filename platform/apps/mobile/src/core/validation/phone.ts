const E164_PHONE_REGEX = /^\+\d{9,15}$/;
const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export function sanitizePhoneInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D+/g, '');
  return hasPlus ? `+${digits}` : digits;
}

export function normalizePhone(value: string): string {
  const sanitized = sanitizePhoneInput(value);
  if (!sanitized) return '';

  if (!sanitized.startsWith('+') && sanitized.startsWith('998')) {
    return `+${sanitized}`;
  }

  return sanitized;
}

export function isValidPhone(value: string): boolean {
  const normalized = normalizePhone(value);
  return E164_PHONE_REGEX.test(normalized);
}

export function getPhoneValidationError(value: string): string | null {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return 'Enter phone number.';
  }

  if (!E164_PHONE_REGEX.test(normalized)) {
    return 'Use international format: +998901234567';
  }

  if (!UZ_PHONE_REGEX.test(normalized)) {
    return 'For this app, use Uzbekistan number format: +998XXXXXXXXX';
  }

  return null;
}

export function formatMoney(amount: number, currency = 'UZS') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatEntityLabel(prefix: string, value?: string | null) {
  if (!value) return prefix;
  const compact = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${prefix} ${compact.slice(0, 6)}`;
}

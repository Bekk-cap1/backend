export function formatIsoDate(value: string | Date): string {
  return new Date(value).toISOString();
}

export function formatHumanDateTime(value: string | Date, locale = 'en-US'): string {
  return new Date(value).toLocaleString(locale);
}

